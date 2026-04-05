package bundle

import (
	"encoding/binary"
	"fmt"
	"io"

	"github.com/oriath-net/gooz"
)

type bundle struct {
	data        io.ReaderAt
	size        int64
	granularity int64 // size of each chunk of uncompressed data, usually 256KiB
	blocks      []bundleBlock
}

// descriptions of compressed blocks relative to bundle.data
type bundleBlock struct {
	offset int64
	length int64
	flags  byte
}

type bundleHead struct {
	UncompressedSize             uint32
	TotalPayloadSize             uint32
	HeadPayloadSize              uint32
	FirstFileEncode              uint32
	_                            uint32
	UncompressedSize2            int64
	TotalPayloadSize2            int64
	BlockCount                   uint32
	UncompressedBlockGranularity uint32
	_                            [4]uint32
}

func openBundle(r io.ReaderAt) (*bundle, error) {
	rs := io.NewSectionReader(r, 0, 1<<24)

	var bh bundleHead
	if err := binary.Read(rs, binary.LittleEndian, &bh); err != nil {
		return nil, fmt.Errorf("failed to read bundle head: %w", err)
	}

	fmt.Printf(
		"openBundle head: headerSize=%d u1=%d payload1=%d headPayload=%d firstFile=%d u2=%d payload2=%d blocks=%d granularity=%d\n",
		binary.Size(bh),
		bh.UncompressedSize,
		bh.TotalPayloadSize,
		bh.HeadPayloadSize,
		bh.FirstFileEncode,
		bh.UncompressedSize2,
		bh.TotalPayloadSize2,
		bh.BlockCount,
		bh.UncompressedBlockGranularity,
	)

	blockSizes := make([]uint32, bh.BlockCount)
	if err := binary.Read(rs, binary.LittleEndian, &blockSizes); err != nil {
		return nil, fmt.Errorf("failed to read bundle block sizes: %w", err)
	}

	flaggedBlocks := 0
	rawBlockSizes := make([]uint32, len(blockSizes))
	copy(rawBlockSizes, blockSizes)
	for i, raw := range blockSizes {
		if raw > 0x00FFFFFF {
			flaggedBlocks++
		}
		blockSizes[i] = raw & 0x00FFFFFF
	}

	if len(blockSizes) > 0 {
		firstEnd := 6
		if len(blockSizes) < firstEnd {
			firstEnd = len(blockSizes)
		}

		lastStart := len(blockSizes) - 6
		if lastStart < 0 {
			lastStart = 0
		}

		fmt.Printf("openBundle blockSizes first=%v last=%v\n", blockSizes[:firstEnd], blockSizes[lastStart:])
	}
	if flaggedBlocks > 0 {
		fmt.Printf("openBundle normalized flagged block sizes: %d\n", flaggedBlocks)
	}
	if len(rawBlockSizes) > 56 {
		fmt.Printf("openBundle raw blockSizes 48-56=%v normalized=%v\n", rawBlockSizes[48:57], blockSizes[48:57])
	}

	blocks := make([]bundleBlock, bh.BlockCount)
	p := int64(binary.Size(bh) + binary.Size(blockSizes))
	for i := range blockSizes {
		sz := int64(blockSizes[i])
		flags := byte(rawBlockSizes[i] >> 24)
		blocks[i] = bundleBlock{offset: p, length: sz, flags: flags}
		p += sz
	}

	b := bundle{
		data:        r,
		size:        bh.UncompressedSize2,
		granularity: int64(bh.UncompressedBlockGranularity),
		blocks:      blocks,
	}

	// do a quick sanity check here
	if b.granularity == 0 {
		return nil, fmt.Errorf("granularity is 0?!")
	}

	expectedBlocks := b.size / b.granularity
	if b.size%b.granularity > 0 {
		expectedBlocks += 1
	}

	if int(expectedBlocks) != len(blocks) {
		return nil, fmt.Errorf(
			"got %d blocks of size %d for %d bytes data",
			len(blocks),
			b.granularity,
			b.size,
		)
	}

	return &b, nil
}

func (b *bundle) Size() int64 {
	return b.size
}

func (b *bundle) ReadAt(p []byte, off int64) (int, error) {
	if off+int64(len(p)) > b.size {
		// FIXME: This could be handled more gracefully
		return 0, fmt.Errorf("read outside bounds of file")
	}

	// Temporary buffers for compressed and decompressed data
	ibuf := make([]byte, b.granularity+64)
	obuf := make([]byte, b.granularity)

	n := 0
	for n < len(p) {
		blkId := int(off / b.granularity)
		blkOff := int(off % b.granularity)
		blk := &b.blocks[blkId]

		rawSize := int(b.granularity)
		if blkId == len(b.blocks)-1 {
			rawSize = int(b.size - int64(blkId)*b.granularity)
		}

		oodleBlk := ibuf[:blk.length]
		if n, err := b.data.ReadAt(oodleBlk, blk.offset); n != len(oodleBlk) {
			return 0, err
		}

		_, err := gooz.Decompress(oodleBlk, obuf[:rawSize])
		if err != nil {
			previewEnd := 16
			if len(oodleBlk) < previewEnd {
				previewEnd = len(oodleBlk)
			}
			return 0, fmt.Errorf(
				"decompression failed at block %d (offset=%d length=%d flags=0x%02X rawSize=%d preview=% X): %w",
				blkId,
				blk.offset,
				blk.length,
				blk.flags,
				rawSize,
				oodleBlk[:previewEnd],
				err,
			)
		}

		copied := copy(p[n:], obuf[blkOff:])
		n += copied
		off += int64(copied)
	}

	return n, nil
}
