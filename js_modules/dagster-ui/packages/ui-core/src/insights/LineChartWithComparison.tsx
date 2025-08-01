import {
  Body,
  BodyLarge,
  Box,
  Colors,
  FontFamily,
  Icon,
  Mono,
  Spinner,
  Subheading,
} from '@dagster-io/ui-components';
import {
  CategoryScale,
  ChartData,
  Chart as ChartJS,
  ChartOptions,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import React, {memo, useCallback, useMemo, useRef} from 'react';
import {Line} from 'react-chartjs-2';

import {TooltipCard} from './InsightsChartShared';
import styles from './css/LineChartWithComparison.module.css';
import {formatMetric} from './formatMetric';
import {ReportingUnitType} from './types';
import {useRGBColorsForTheme} from '../app/useRGBColorsForTheme';
import {Context, useRenderChartTooltip} from '../assets/insights/renderChartTooltip';
import {formatDuration} from '../ui/formatDuration';
import {numberFormatterWithMaxFractionDigits, percentFormatter} from '../ui/formatters';
import {useFormatDateTime} from '../ui/useFormatDateTime';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip);

export type LineChartMetrics = {
  title: string;
  color: string;
  timestamps: number[];
  pctChange: number | null;
  currentPeriod: {
    label: string;
    data: (number | null)[];
    aggregateValue: number | null;
    color: string;
  };
  prevPeriod: {
    label: string;
    data: (number | null)[];
    aggregateValue: number | null;
    color: string;
  };
};

export const getDataset = (
  metrics: LineChartMetrics,
  formatDatetime: (date: Date, options: Intl.DateTimeFormatOptions) => string,
): ChartData<'line', (number | null)[], string> => {
  const firstTimestamp = metrics.timestamps[0] ?? null;
  const lastTimestamp = metrics.timestamps[metrics.timestamps.length - 1] ?? null;

  const start = firstTimestamp
    ? formatDatetime(new Date(firstTimestamp * 1000), {
        month: 'short',
        day: 'numeric',
      })
    : '';
  const end = lastTimestamp
    ? formatDatetime(new Date(lastTimestamp * 1000), {
        month: 'short',
        day: 'numeric',
      })
    : '';

  const labels = metrics.timestamps.length
    ? [start, ...Array(metrics.timestamps.length - 2).fill(''), end]
    : [];

  return {
    labels,
    datasets: [
      {
        label: metrics.currentPeriod.label,
        data: metrics.currentPeriod.data,
        borderColor: metrics.currentPeriod.color,
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderWidth: 2,
        pointHoverRadius: 6,
        pointHoverBorderColor: metrics.currentPeriod.color,
      },
      {
        label: metrics.prevPeriod.label,
        data: metrics.prevPeriod.data,
        borderColor: metrics.prevPeriod.color,
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderWidth: 2,
        pointHoverRadius: 6,
        pointHoverBorderColor: metrics.prevPeriod.color,
      },
    ],
  };
};

type MetricDialogData<T> = {
  after: number;
  before: number;
  metric: T;
  unit: string;
};

interface Props<T> {
  metrics: LineChartMetrics;
  loading: boolean;
  unitType: ReportingUnitType;
  openMetricDialog?: (data: MetricDialogData<T>) => void;
  metricName: T;
}

const InnerLineChartWithComparison = <T,>(props: Props<T>) => {
  const {metrics, loading, unitType, openMetricDialog, metricName} = props;
  const formatDatetime = useFormatDateTime();
  const rgbColors = useRGBColorsForTheme();

  const renderTooltipFn = useRenderChartTooltip(
    useCallback(
      ({context}: {context: Context}) => {
        const {tooltip} = context;
        const currentPeriodDataPoint = tooltip.dataPoints[0];
        const prevPeriodDataPoint = tooltip.dataPoints[1];

        if (!currentPeriodDataPoint || !prevPeriodDataPoint) {
          return <div />;
        }

        const timestamp = metrics.timestamps[currentPeriodDataPoint.dataIndex];
        if (!timestamp) {
          return <div />;
        }

        const date = formatDatetime(new Date(timestamp * 1000), {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        });
        const currentPeriodMetric = metrics.currentPeriod.data[currentPeriodDataPoint.dataIndex];

        return (
          <TooltipCard>
            <Box flex={{direction: 'column'}}>
              <Box border="bottom" padding={{horizontal: 12, vertical: 8}}>
                <Subheading>{date}</Subheading>
              </Box>
              <Box padding={{horizontal: 16, vertical: 12}}>
                <Box
                  flex={{direction: 'row', justifyContent: 'space-between'}}
                  margin={{bottom: 4}}
                >
                  <Box flex={{direction: 'row', alignItems: 'center', gap: 8}}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: metrics.currentPeriod.color,
                        borderRadius: '50%',
                      }}
                    />
                    <Body>Current period</Body>
                  </Box>
                  <Box flex={{direction: 'row', alignItems: 'center', gap: 4}}>
                    <Mono>{currentPeriodDataPoint?.formattedValue ?? 0}</Mono>
                    <Body color={Colors.textLight()}>{unitTypeToLabel[unitType]}</Body>
                  </Box>
                </Box>
                <Box flex={{direction: 'row', justifyContent: 'space-between'}}>
                  <Box flex={{direction: 'row', alignItems: 'center', gap: 8}}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: metrics.prevPeriod.color,
                        borderRadius: '50%',
                      }}
                    />
                    <Body>Previous period</Body>
                  </Box>
                  <Box flex={{direction: 'row', alignItems: 'center', gap: 4}}>
                    <Mono>{prevPeriodDataPoint?.formattedValue ?? 0}</Mono>
                    <Body color={Colors.textLight()}>{unitTypeToLabel[unitType]}</Body>
                  </Box>
                </Box>
              </Box>
              {currentPeriodMetric && openMetricDialog ? (
                <Box padding={{horizontal: 12, vertical: 8}} border="top">
                  <Body color={Colors.textLight()}>Click to view details</Body>
                </Box>
              ) : null}
            </Box>
          </TooltipCard>
        );
      },
      [formatDatetime, metrics, openMetricDialog, unitType],
    ),
    useMemo(() => ({side: 'top', sideOffset: 50, align: 'start', alignOffset: 50}), []),
  );

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      plugins: {
        legend: {display: false},
        tooltip: {
          enabled: false,
          position: 'nearest',
          external: renderTooltipFn,
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: rgbColors[Colors.textLight()],
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
            includeBounds: true,
          },
        },
        y: {
          border: {
            display: false,
          },
          grid: {color: rgbColors[Colors.keylineDefault()]},
          beginAtZero: true,
          ticks: {
            color: rgbColors[Colors.textLight()],
            font: {
              size: 12,
              family: FontFamily.monospace,
            },
            callback(value: string | number) {
              return formatMetric(value, unitType, {
                integerFormat: 'compact',
                floatPrecision: 'maximum-precision',
                floatFormat: 'compact-above-threshold',
              });
            },
          },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    }),
    [renderTooltipFn, rgbColors, unitType],
  );

  const chartRef = useRef(null);
  const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current) {
      return;
    }

    const chart = ChartJS.getChart(chartRef.current);
    if (!chart) {
      return;
    }

    const clickedElements = chart.getElementsAtEventForMode(
      event.nativeEvent,
      'index',
      {axis: 'x', intersect: false},
      false, // get elements in the clicked position even if animations are not completed
    );

    if (clickedElements.length > 0) {
      const element = clickedElements[0];
      if (element) {
        const index = element.index;
        let timeSliceSeconds = 60 * 60; // Default to 1 hour
        if (metrics.timestamps.length >= 2) {
          const timeSliceStart = metrics.timestamps[0];
          const timeSliceEnd = metrics.timestamps[1];
          if (timeSliceStart && timeSliceEnd) {
            timeSliceSeconds = timeSliceEnd - timeSliceStart;
          }
        }

        const before = metrics.timestamps[index];
        if (typeof before !== 'number') {
          return;
        }

        const after = before - timeSliceSeconds;

        // Only open the dialog if data exists for the clicked index
        // in the current period
        if (metrics.currentPeriod.data[index] && openMetricDialog) {
          openMetricDialog({
            after,
            before,
            metric: metricName,
            unit: unitType,
          });
        }
      }
    }
  };

  function getDisplayValueAndUnit(value: number) {
    if (unitType === ReportingUnitType.TIME_MS) {
      return formatDuration(value, {unit: 'milliseconds'})[0];
    }
    return {value, unit: unitTypeToLabel[unitType]};
  }

  const currentPeriodDisplayValueAndUnit = getDisplayValueAndUnit(
    metrics.currentPeriod.aggregateValue ?? 0,
  );
  const prevPeriodDisplayValueAndUnit = getDisplayValueAndUnit(
    metrics.prevPeriod.aggregateValue ?? 0,
  );

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <Box flex={{direction: 'row', gap: 4, justifyContent: 'space-between'}}>
          <BodyLarge>{metrics.title}</BodyLarge>
          {loading ? <Spinner purpose="body-text" /> : null}
        </Box>
      </div>
      <Box flex={{direction: 'column', justifyContent: 'space-between'}}>
        <div className={styles.chartCount}>
          {metrics.currentPeriod.aggregateValue
            ? numberFormatterWithMaxFractionDigits(2).format(currentPeriodDisplayValueAndUnit.value)
            : 0}
          <Body color={Colors.textDefault()}>{currentPeriodDisplayValueAndUnit.unit}</Body>
        </div>
        <Box
          className={styles.chartChange}
          flex={{direction: 'row', gap: 4, justifyContent: 'space-between'}}
        >
          <Box flex={{direction: 'row', gap: 4, alignItems: 'center'}}>
            {metrics.prevPeriod.aggregateValue
              ? numberFormatterWithMaxFractionDigits(2).format(prevPeriodDisplayValueAndUnit.value)
              : 0}
            <span> previous period</span>
          </Box>
          <Box flex={{direction: 'row', gap: 4, alignItems: 'center'}}>
            {metrics.pctChange && metrics.pctChange > 0 ? (
              <Icon name="trending_up" size={16} color={Colors.textLighter()} />
            ) : metrics.pctChange && metrics.pctChange < 0 ? (
              <Icon name="trending_down" size={16} color={Colors.textLighter()} />
            ) : null}
            {percentFormatter.format(Math.abs(metrics.pctChange ?? 0))}
          </Box>
        </Box>
      </Box>
      <div className={styles.chartWrapper}>
        <div className={styles.chartGraph}>
          <Line
            ref={chartRef}
            data={getDataset(metrics, formatDatetime)}
            options={options}
            onClick={onClick}
            updateMode="none"
          />
        </div>
      </div>
    </div>
  );
};

export const LineChartWithComparison = memo(
  InnerLineChartWithComparison,
) as typeof InnerLineChartWithComparison;

const unitTypeToLabel: Record<ReportingUnitType, string> = {
  [ReportingUnitType.TIME_MS]: 'ms',
  [ReportingUnitType.INTEGER]: '',
  [ReportingUnitType.FLOAT]: '',
};
