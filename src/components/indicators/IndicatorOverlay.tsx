import React, { useEffect, useState } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData } from '../../types/chart';
import { IndicatorInstance } from '../../types/indicators';
import { calculateSessions, calculateVolumaticORB } from '../../services/indicatorEngine';

interface IndicatorOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'> | null;
  candles: CandleData[];
  activeIndicators: IndicatorInstance[];
}

export const IndicatorOverlay: React.FC<IndicatorOverlayProps> = ({
  chart,
  series,
  candles,
  activeIndicators,
}) => {
  const [, setForceUpdate] = useState(0);

  useEffect(() => {
    if (!chart) return;
    const handleRangeChange = () => setForceUpdate(n => n + 1);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      try {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      } catch {}
    };
  }, [chart]);

  if (!chart || !series || candles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <svg className="w-full h-full">
        {activeIndicators.map(inst => {
          if (!inst.enabled || !inst.visible) return null;

          // Render Sessions
          if (inst.definitionId === 'sessions') {
            const utc = inst.inputs.utcOffset ?? 5;
            const aCol = inst.style.asiaColor || '#2962FF';
            const lCol = inst.style.londonColor || '#00C853';
            const nCol = inst.style.nyColor || '#FF1744';
            const showLabels = false; // Hidden per user requirement
            const sessionLabelName = inst.inputs.sessionLabelName ?? true;
            const sessionLabelHours = inst.inputs.sessionLabelHours ?? true;
            const sessionLabelHighLow = inst.inputs.sessionLabelHighLow ?? true;
            const labelHighlightBg = inst.inputs.labelHighlightBg ?? true;
            const sessions = calculateSessions(candles, utc, aCol, lCol, nCol);

            return sessions.map(box => {
              const x1 = chart.timeScale().timeToCoordinate(box.startTime as any);
              const x2 = chart.timeScale().timeToCoordinate(box.endTime as any);
              const y1 = series.priceToCoordinate(box.high);
              const y2 = series.priceToCoordinate(box.low);
              if (x1 === null || x2 === null || y1 === null || y2 === null) return null;

              const left = Math.min(x1, x2);
              const width = Math.max(2, Math.abs(x2 - x1));
              const top = Math.min(y1, y2);
              const height = Math.max(2, Math.abs(y1 - y2));

              const textParts: string[] = [];
              if (sessionLabelName) textParts.push(box.name);
              if (sessionLabelHours) {
                const hours = box.name === 'Asia' ? '06:00-10:00' : box.name === 'London' ? '12:00-16:00' : '18:00-22:00';
                textParts.push(hours);
              }
              if (sessionLabelHighLow) {
                textParts.push(`H:${box.high.toFixed(1)} L:${box.low.toFixed(1)}`);
              }
              const labelText = textParts.join(' • ');
              const labelWidth = Math.max(50, labelText.length * 6.2 + 14);

              return (
                <g key={box.id}>
                  <rect
                    x={left}
                    y={top}
                    width={width}
                    height={height}
                    fill={box.color}
                    stroke={box.borderColor}
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    rx={4}
                  />
                  {showLabels && labelText && (
                    <g>
                      {labelHighlightBg && (
                        <rect
                          x={left + 4}
                          y={top + 4}
                          width={labelWidth}
                          height={17}
                          rx={3}
                          fill="#131722"
                          fillOpacity={0.92}
                          stroke={box.borderColor}
                          strokeWidth={0.8}
                        />
                      )}
                      <text
                        x={left + (labelHighlightBg ? 9 : 6)}
                        y={top + 16}
                        fill={box.borderColor}
                        fontSize={9}
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="select-none pointer-events-none"
                      >
                        {labelText}
                      </text>
                    </g>
                  )}
                </g>
              );
            });
          }

          // Render Volumatic ORB
          if (inst.definitionId === 'volumatic_orb') {
            const startTime = inst.inputs.startTime || '06:30';
            const endTime = inst.inputs.endTime || '06:45';
            const utcOffset = inst.inputs.utcOffset ?? 5;
            const rangeColor = inst.style.rangeColor || '#E040FB';
            const bullishBreakColor = inst.style.bullishBreakColor || '#00FF68';
            const bearishBreakColor = inst.style.bearishBreakColor || '#FF0008';
            const opacity = inst.style.opacity ?? 0.08;

            const showLabels = false; // Hidden per user requirement
            const orbLabelTitle = inst.inputs.orbLabelTitle ?? true;
            const orbLabelPrice = inst.inputs.orbLabelPrice ?? true;
            const labelHighlightBg = inst.inputs.labelHighlightBg ?? true;
            const showBreakoutSignals = inst.inputs.showBreakoutSignals ?? true;

            const items = calculateVolumaticORB(
              candles,
              startTime,
              endTime,
              utcOffset,
              rangeColor,
              bullishBreakColor,
              bearishBreakColor,
              opacity
            );

            return (
              <g key={inst.instanceId}>
                {items.map(item => {
                  const x1 = chart.timeScale().timeToCoordinate(item.startTime as any);
                  const x2 = chart.timeScale().timeToCoordinate(item.endOfDayTime as any);
                  const y1 = series.priceToCoordinate(item.high);
                  const y2 = series.priceToCoordinate(item.low);

                  if (x1 === null || x2 === null || y1 === null || y2 === null) return null;

                  const left = Math.min(x1, x2);
                  const width = Math.max(10, Math.abs(x2 - x1));
                  const top = Math.min(y1, y2);
                  const height = Math.max(2, Math.abs(y1 - y2));

                  const breakUpX = item.breakoutUpTime ? chart.timeScale().timeToCoordinate(item.breakoutUpTime as any) : null;
                  const breakDownX = item.breakoutDownTime ? chart.timeScale().timeToCoordinate(item.breakoutDownTime as any) : null;

                  return (
                    <g key={item.id}>
                      <rect
                        x={left}
                        y={top}
                        width={width}
                        height={height}
                        fill={item.color}
                        stroke={item.borderColor}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        rx={2}
                      />

                      <line
                        x1={left}
                        y1={top}
                        x2={left + width}
                        y2={top}
                        stroke={item.borderColor}
                        strokeWidth={1.5}
                      />
                      <line
                        x1={left}
                        y1={y2}
                        x2={left + width}
                        y2={y2}
                        stroke={item.borderColor}
                        strokeWidth={1.5}
                      />

                      {showLabels && (
                        <g>
                          {orbLabelTitle && (
                            <g>
                              {labelHighlightBg && (
                                <rect
                                  x={left + 5}
                                  y={top - 15}
                                  width={orbLabelPrice ? 120 : 65}
                                  height={14}
                                  rx={2}
                                  fill="#131722"
                                  fillOpacity={0.85}
                                  stroke={item.borderColor}
                                  strokeWidth={0.5}
                                />
                              )}
                              <text
                                x={left + 8}
                                y={top - 4}
                                fill={item.borderColor}
                                fontSize={8.5}
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                ORB High{orbLabelPrice ? `: $${item.high.toFixed(1)}` : ''}
                              </text>
                            </g>
                          )}

                          {orbLabelTitle && (
                            <g>
                              {labelHighlightBg && (
                                <rect
                                  x={left + 5}
                                  y={y2 + 2}
                                  width={orbLabelPrice ? 125 : 65}
                                  height={14}
                                  rx={2}
                                  fill="#131722"
                                  fillOpacity={0.85}
                                  stroke={item.borderColor}
                                  strokeWidth={0.5}
                                />
                              )}
                              <text
                                x={left + 8}
                                y={y2 + 12}
                                fill={item.borderColor}
                                fontSize={8.5}
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                ORB Low{orbLabelPrice ? `: $${item.low.toFixed(1)}` : ''}
                              </text>
                            </g>
                          )}
                        </g>
                      )}

                      {showBreakoutSignals && (
                        <g>
                          {breakUpX !== null && (
                            <g>
                              <polygon
                                points={`${breakUpX},${top - 12} ${breakUpX - 6},${top - 4} ${breakUpX + 6},${top - 4}`}
                                fill={bullishBreakColor}
                                stroke="#131722"
                                strokeWidth={1}
                              />
                              <text
                                x={breakUpX}
                                y={top - 15}
                                fill={bullishBreakColor}
                                fontSize={8}
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                BUY BREAK
                              </text>
                            </g>
                          )}

                          {breakDownX !== null && (
                            <g>
                              <polygon
                                points={`${breakDownX},${y2 + 12} ${breakDownX - 6},${y2 + 4} ${breakDownX + 6},${y2 + 4}`}
                                fill={bearishBreakColor}
                                stroke="#131722"
                                strokeWidth={1}
                              />
                              <text
                                x={breakDownX}
                                y={y2 + 21}
                                fill={bearishBreakColor}
                                fontSize={8}
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                SELL BREAK
                              </text>
                            </g>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
};
