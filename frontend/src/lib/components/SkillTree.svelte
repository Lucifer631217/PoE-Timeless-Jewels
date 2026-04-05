<script lang="ts">
  import { Canvas, Layer, t } from 'svelte-canvas';
  import type { RenderFunc, Node } from '../skill_tree_types';
  import {
    baseJewelRadius,
    calculateNodePos,
    distance,
    drawnGroups,
    drawnNodes,
    inverseSprites,
    inverseSpritesActive,
    orbitAngleAt,
    skillTree,
    splitBilingualStatText,
    translateStatBilingual,
    toCanvasCoords
  } from '../skill_tree';
  import type { Point } from '../skill_tree';
  import { translateAlternateSkillName } from '../zh_tw';
  import { derived } from 'svelte/store';
  import { calculator, data } from '../types';

  export let clickNode: (node: Node) => void;
  export let circledNode: number | undefined;

  export let selectedJewel: number;
  export let selectedConqueror: string;
  export let seed: number;
  export let highlighted: number[] = [];
  export let disabled: number[] = [];
  export let highlightJewels = false;

  const slowTime = derived(t, (values) => {
    if ((!highlighted || !highlighted.length) && !highlightJewels) {
      return 0;
    }

    return Math.round(values / 40);
  });

  const startGroups = [427, 320, 226, 227, 323, 422, 329];

  const titleFont = '25px Roboto Mono';
  const statsFont = '17px Roboto Mono';

  let scaling = 10;

  let offsetX = 0;
  let offsetY = 0;

  $: jewelRadius = baseJewelRadius / scaling;

  const drawScaling = 2.6;

  const spriteCache: Record<string, HTMLImageElement> = {};
  const spriteCacheActive: Record<string, HTMLImageElement> = {};
  const drawSprite = (
    context: CanvasRenderingContext2D,
    path: string,
    pos: Point,
    active = false,
    mirrored = false
  ) => {
    let sprite = active ? inverseSpritesActive[path] : inverseSprites[path];

    if (!sprite && active) {
      sprite = inverseSprites[path];
    }

    const spriteSheetUrl = sprite.filename;

    if (!(spriteSheetUrl in (active ? spriteCacheActive : spriteCache))) {
      (active ? spriteCacheActive : spriteCache)[spriteSheetUrl] = new Image();
      (active ? spriteCacheActive : spriteCache)[spriteSheetUrl].src = spriteSheetUrl;
    }

    const self = sprite.coords[path];

    const newWidth = (self.w / scaling) * drawScaling;
    const newHeight = (self.h / scaling) * drawScaling;

    const topLeftX = pos.x - newWidth / 2;
    const topLeftY = pos.y - newHeight / 2;

    let finalY = topLeftY;

    if (mirrored) {
      finalY = topLeftY - newHeight / 2;
    }

    context.drawImage(
      (active ? spriteCacheActive : spriteCache)[spriteSheetUrl],
      self.x,
      self.y,
      self.w,
      self.h,
      topLeftX,
      finalY,
      newWidth,
      newHeight
    );

    if (mirrored) {
      context.save();

      context.translate(topLeftX, topLeftY);
      context.rotate(Math.PI);

      context.drawImage(
        (active ? spriteCacheActive : spriteCache)[spriteSheetUrl],
        self.x,
        self.y,
        self.w,
        self.h,
        -newWidth,
        -(newHeight / 2),
        newWidth,
        -newHeight
      );

      context.restore();
    }
  };

  const wrapText = (text: string, context: CanvasRenderingContext2D, width: number): string[] => {
    const result: string[] = [];
    const tokens = text.split(' ');
    let currentLine = '';

    const pushTokenByCharacters = (token: string) => {
      let segment = '';
      for (const character of token) {
        const candidate = `${segment}${character}`;
        if (segment && context.measureText(candidate).width >= width) {
          result.push(segment);
          segment = character;
        } else {
          segment = candidate;
        }
      }
      return segment;
    };

    tokens.forEach((token) => {
      const candidate = currentLine ? `${currentLine} ${token}` : token;
      if (context.measureText(candidate).width < width) {
        currentLine = candidate;
        return;
      }

      if (currentLine) {
        result.push(currentLine);
        currentLine = '';
      }

      if (context.measureText(token).width < width) {
        currentLine = token;
        return;
      }

      currentLine = pushTokenByCharacters(token);
    });

    if (currentLine.length > 0) {
      result.push(currentLine);
    }

    return result;
  };

  let mousePos: Point = {
    x: Number.MIN_VALUE,
    y: Number.MIN_VALUE
  };

  let cursor = 'unset';

  let hoveredNode: Node | undefined;
  $: render = (({ context, width, height }) => {
    const start = window.performance.now();

    context.clearRect(0, 0, width, height);

    context.fillStyle = '#080c11';
    context.fillRect(0, 0, width, height);

    const connected: Record<string, boolean> = {};
    Object.keys(drawnGroups).forEach((groupIdStr) => {
      const groupId = parseInt(groupIdStr);
      const group = drawnGroups[groupId];
      if (!group) {
        return;
      }
      const groupPos = toCanvasCoords(group.x, group.y, offsetX, offsetY, scaling);

      const maxOrbit = Math.max(...group.orbits);
      if (startGroups.indexOf(groupId) >= 0) {
        // Do not draw starter nodes
      } else if (maxOrbit == 1) {
        drawSprite(context, 'PSGroupBackground1', groupPos, false);
      } else if (maxOrbit == 2) {
        drawSprite(context, 'PSGroupBackground2', groupPos, false);
      } else if (maxOrbit == 3 || group.orbits.length > 1) {
        drawSprite(context, 'PSGroupBackground3', groupPos, false, true);
        // drawMirror(context, $PSGroupBackground3, groupPos);
      }
    });

    Object.keys(drawnNodes).forEach((nodeIdStr) => {
      const nodeId = parseInt(nodeIdStr);
      const node = drawnNodes[nodeId];
      if (!node) {
        return;
      }
      const angle = node.orbit !== undefined && node.orbitIndex !== undefined ? orbitAngleAt(node.orbit, node.orbitIndex) : 0;
      const rotatedPos = calculateNodePos(node, offsetX, offsetY, scaling);

      node.out?.forEach((o: string) => {
        if (!drawnNodes[parseInt(o)]) {
          return;
        }

        const min = Math.min(parseInt(o), nodeId);
        const max = Math.max(parseInt(o), nodeId);
        const joined = min + ':' + max;

        if (joined in connected) {
          return;
        }
        connected[joined] = true;

        const targetNode = drawnNodes[parseInt(o)];
        if (!targetNode) {
          return;
        }

        // Do not draw connections to mastery nodes
        if (targetNode.isMastery) {
          return;
        }

        const targetAngle =
          targetNode.orbit !== undefined && targetNode.orbitIndex !== undefined
            ? orbitAngleAt(targetNode.orbit, targetNode.orbitIndex)
            : 0;
        const targetRotatedPos = calculateNodePos(targetNode, offsetX, offsetY, scaling);

        context.beginPath();

        if (node.group != targetNode.group || node.orbit != targetNode.orbit) {
          context.moveTo(rotatedPos.x, rotatedPos.y);
          context.lineTo(targetRotatedPos.x, targetRotatedPos.y);
        } else {
          let a = Math.PI / 180 - (Math.PI / 180) * angle;
          let b = Math.PI / 180 - (Math.PI / 180) * targetAngle;

          a -= Math.PI / 2;
          b -= Math.PI / 2;

          const diff = Math.abs(Math.max(a, b) - Math.min(a, b));

          const finalA = diff > Math.PI ? Math.max(a, b) : Math.min(a, b);
          const finalB = diff > Math.PI ? Math.min(a, b) : Math.max(a, b);

          if (node.group === undefined || node.orbit === undefined) {
            return;
          }
          const group = drawnGroups[node.group];
          if (!group) {
            return;
          }
          const groupPos = toCanvasCoords(group.x, group.y, offsetX, offsetY, scaling);
          context.arc(groupPos.x, groupPos.y, skillTree.constants.orbitRadii[node.orbit] / scaling + 1, finalA, finalB);
        }

        context.lineWidth = 6 / scaling;
        context.strokeStyle = `#524518`;
        context.stroke();
      });
    });

    let circledNodePos: Point | undefined;
    if (circledNode && drawnNodes[circledNode]) {
      circledNodePos = calculateNodePos(drawnNodes[circledNode], offsetX, offsetY, scaling);
      context.strokeStyle = '#ad2b2b';
    }

    let hoveredNodeActive = false;
    let newHoverNode: Node | undefined;
    Object.keys(drawnNodes).forEach((nodeIdStr) => {
      const nodeId = parseInt(nodeIdStr);
      const node = drawnNodes[nodeId];
      if (!node) {
        return;
      }
      const rotatedPos = calculateNodePos(node, offsetX, offsetY, scaling);
      let touchDistance = 0;

      let active = false;
      if (circledNodePos) {
        if (distance(rotatedPos, circledNodePos) < jewelRadius) {
          active = true;
        }
      }

      if (node.skill !== undefined && disabled.indexOf(node.skill) >= 0) {
        active = false;
      }

      if (node.isKeystone) {
        touchDistance = 110;
        if (node.icon) {
          drawSprite(context, node.icon, rotatedPos, active);
        }
        if (active) {
          drawSprite(context, 'KeystoneFrameAllocated', rotatedPos, false);
        } else {
          drawSprite(context, 'KeystoneFrameUnallocated', rotatedPos, false);
        }
      } else if (node.isNotable) {
        touchDistance = 70;
        if (node.icon) {
          drawSprite(context, node.icon, rotatedPos, active);
        }
        if (active) {
          drawSprite(context, 'NotableFrameAllocated', rotatedPos, false);
        } else {
          drawSprite(context, 'NotableFrameUnallocated', rotatedPos, false);
        }
      } else if (node.isJewelSocket) {
        touchDistance = 70;
        if (node.expansionJewel) {
          if (active) {
            drawSprite(context, 'JewelSocketAltNormal', rotatedPos, false);
          } else {
            drawSprite(context, 'JewelSocketAltNormal', rotatedPos, false);
          }
        } else {
          if (active) {
            drawSprite(context, 'JewelFrameAllocated', rotatedPos, false);
          } else {
            drawSprite(context, 'JewelFrameUnallocated', rotatedPos, false);
          }
        }
      } else if (node.isMastery) {
        if (node.inactiveIcon) {
          drawSprite(context, node.inactiveIcon, rotatedPos, active);
        }
      } else {
        touchDistance = 50;
        if (node.icon) {
          drawSprite(context, node.icon, rotatedPos, active);
        }
        if (active) {
          drawSprite(context, 'PSSkillFrameActive', rotatedPos, false);
        } else {
          drawSprite(context, 'PSSkillFrame', rotatedPos, false);
        }
      }

      if ((node.skill !== undefined && highlighted.indexOf(node.skill) >= 0) || (highlightJewels && node.isJewelSocket)) {
        context.strokeStyle = `hsl(${$slowTime}, 100%, 50%)`;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(rotatedPos.x, rotatedPos.y, (touchDistance + 30) / scaling, 0, Math.PI * 2);
        context.stroke();
      }

      if (distance(rotatedPos, mousePos) < touchDistance / scaling) {
        newHoverNode = node;
        hoveredNodeActive = active;
      }
    });

    hoveredNode = newHoverNode;

    if (circledNodePos) {
      context.strokeStyle = '#ad2b2b';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(circledNodePos.x, circledNodePos.y, jewelRadius, 0, Math.PI * 2);
      context.stroke();
    }

    if (hoveredNode) {
      let nodeName = hoveredNode.name || '';
      let nodeStats: { text: string; special: boolean }[] = (hoveredNode.stats || []).map((text) => ({
        text,
        special: false
      }));

      if (!hoveredNode.isJewelSocket && hoveredNodeActive) {
        if (hoveredNode.skill !== undefined && seed && selectedJewel && selectedConqueror) {
          const passiveEntry = data.TreeToPassive?.[hoveredNode.skill];
          const result = passiveEntry
            ? calculator.Calculate(passiveEntry.Index, seed, selectedJewel, selectedConqueror)
            : undefined;

          if (result) {
            if ('AlternatePassiveSkill' in result && result.AlternatePassiveSkill) {
              nodeStats = [];
              nodeName = translateAlternateSkillName(result.AlternatePassiveSkill.Name);

              if (result.AlternatePassiveSkill.StatsKeys) {
                const statRolls = result.StatRolls || {};
                result.AlternatePassiveSkill.StatsKeys.forEach((statId, i) => {
                  const statRoll = statRolls[i];
                  if (statRoll !== undefined) {
                    nodeStats.push({
                      text: translateStatBilingual(statId, statRoll),
                      special: true
                    });
                  }
                });
              }
            }

            if (result.AlternatePassiveAdditionInformations) {
              result.AlternatePassiveAdditionInformations.forEach((info) => {
                const addition = info.AlternatePassiveAddition;
                const additionRolls = info.StatRolls || {};
                if (addition?.StatsKeys) {
                  addition.StatsKeys.forEach((statId, i) => {
                    const statRoll = additionRolls[i];
                    if (statRoll !== undefined) {
                      nodeStats.push({
                        text: translateStatBilingual(statId, statRoll),
                        special: true
                      });
                    }
                  });
                }
              });
            }
          }
        }
      }

      context.font = titleFont;
      const textMetrics = context.measureText(nodeName);

      const maxWidth = Math.max(textMetrics.width + 50, 600);

      context.font = statsFont;

      const allLines: {
        localized?: string;
        english?: string;
        offset: number;
        indent: number;
        special: boolean;
      }[] = [];

      const padding = 30;

      let offset = 85;

      const pushTooltipText = (text: string, special: boolean) => {
        if (!special) {
          wrapText(text, context, maxWidth - padding).forEach((line) => {
            allLines.push({
              localized: line,
              offset,
              indent: 0,
              special: false
            });
            offset += 20;
          });
          return;
        }

        const parts = splitBilingualStatText(text);
        wrapText(parts.localized, context, maxWidth - padding).forEach((line) => {
          allLines.push({
            localized: line,
            offset,
            indent: 0,
            special: true
          });
          offset += 20;
        });

        if (!parts.english) {
          return;
        }

        wrapText(parts.english, context, maxWidth - padding - 18).forEach((line) => {
          allLines.push({
            english: line,
            offset,
            indent: 18,
            special: true
          });
          offset += 20;
        });
      };

      if (nodeStats && nodeStats.length > 0) {
        nodeStats.forEach((stat) => {
          if (allLines.length > 0) {
            offset += 5;
          }

          stat.text.split('\n').forEach((line) => {
            if (allLines.length > 0) {
              offset += 10;
            }

            pushTooltipText(line, stat.special);
          });
        });
      } else if (hoveredNode.isJewelSocket) {
        allLines.push({
          localized: '點擊以選取此珠寶插槽',
          offset,
          indent: 0,
          special: true
        });

        offset += 20;
      }

      const titleHeight = 55;

      context.fillStyle = 'rgba(75,63,24,0.9)';
      context.fillRect(mousePos.x, mousePos.y, maxWidth, titleHeight);

      context.fillStyle = '#ffffff';
      context.font = titleFont;
      context.textAlign = 'center';
      context.fillText(nodeName, mousePos.x + maxWidth / 2, mousePos.y + 35);

      context.fillStyle = 'rgba(0,0,0,0.8)';
      context.fillRect(mousePos.x, mousePos.y + titleHeight, maxWidth, offset - titleHeight);

      context.font = statsFont;
      context.textAlign = 'left';
      allLines.forEach((l) => {
        if (l.localized) {
          context.fillStyle = l.special ? '#9be45f' : '#f4ead5';
          context.fillText(l.localized, mousePos.x + padding / 2 + l.indent, mousePos.y + l.offset);
          return;
        }

        context.fillStyle = '#79b8ff';
        context.fillText(l.english || '', mousePos.x + padding / 2 + l.indent, mousePos.y + l.offset);
      });
    }

    if (hoveredNode && hoveredNode.isJewelSocket) {
      cursor = 'pointer';
    } else {
      cursor = 'unset';
    }

    context.fillStyle = '#ffffff';
    context.textAlign = 'right';
    context.font = '12px Roboto Mono';

    const end = window.performance.now();

    context.fillText(`${(end - start).toFixed(1)}ms`, width - 5, 17);
  }) as RenderFunc;

  let downX = 0;
  let downY = 0;

  let startX = 0;
  let startY = 0;

  let down = false;
  const mouseDown = (event: MouseEvent) => {
    down = true;
    downX = event.offsetX;
    downY = event.offsetY;
    startX = offsetX;
    startY = offsetY;

    mousePos = {
      x: event.offsetX,
      y: event.offsetY
    };

    if (hoveredNode) {
      clickNode(hoveredNode);
    }
  };

  const mouseUp = (event: PointerEvent) => {
    if (event.type === 'pointerup') {
      down = false;
    }

    mousePos = {
      x: event.offsetX,
      y: event.offsetY
    };
  };

  const mouseMove = (event: MouseEvent) => {
    if (down) {
      offsetX = startX - (downX - event.offsetX) * scaling;
      offsetY = startY - (downY - event.offsetY) * scaling;
    }

    mousePos = {
      x: event.offsetX,
      y: event.offsetY
    };
  };

  const onScroll = (event: WheelEvent) => {
    if (event.deltaY > 0) {
      if (scaling < 30) {
        offsetX += event.offsetX;
        offsetY += event.offsetY;
      }
    } else {
      if (scaling > 3) {
        offsetX -= event.offsetX;
        offsetY -= event.offsetY;
      }
    }

    scaling = Math.min(30, Math.max(3, scaling + event.deltaY / 100));

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  let width = 0;
  let height = 0;
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
  };

  let initialized = false;
  $: {
    if (!initialized && skillTree) {
      initialized = true;
      offsetX = skillTree.min_x + (window.innerWidth / 2) * scaling;
      offsetY = skillTree.min_y + (window.innerHeight / 2) * scaling;
    }
    resize();
  }
</script>

<svelte:window on:pointerup={mouseUp} on:pointermove={mouseMove} on:resize={resize} />

{#if width && height}
  <div on:resize={resize} style="touch-action: none; cursor: {cursor}">
    <Canvas {width} {height} on:pointerdown={mouseDown} on:wheel={onScroll}>
      <Layer {render} />
    </Canvas>
    <slot />
  </div>
{/if}
