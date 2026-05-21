import { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { useTheme } from "../contexts/ThemeContext";

const chartMonths = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const monthChartLabel = {
  enero: "ene",
  febrero: "feb",
  marzo: "mar",
  abril: "abr",
  mayo: "may",
  junio: "jun",
  julio: "jul",
  agosto: "ago",
  septiembre: "sep",
  octubre: "oct",
  noviembre: "nov",
  diciembre: "dic",
};

/** Default spending threshold on all-negative monthly bar charts (absolute scale). */
export const SUMMARY_CHART_NEGATIVE_REFERENCE_DEFAULT = 5_000_000;

/** Round up to a readable axis limit (e.g. 900k → 1.1M with padding). */
function roundChartAxisLimit(absValue) {
  if (absValue <= 0) return 10;
  const padded = absValue * 1.1;
  const unit = 10 ** Math.floor(Math.log10(padded));
  return Math.ceil(padded / unit) * unit;
}

function formatChartYLabel(value, { signFromPrefix = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  const sign = !signFromPrefix && n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return signFromPrefix ? String(Math.round(abs)) : String(Math.round(n));
}

function buildChartModel(
  tableData,
  primaryColor,
  negativeReference = SUMMARY_CHART_NEGATIVE_REFERENCE_DEFAULT,
  includeReferenceLine = true,
) {
  const noOfSections = 4;
  const points = chartMonths.map((month) => {
    const value = tableData.reduce(
      (sum, row) => sum + (Number(row[month]) || 0),
      0,
    );
    return {
      value: Math.round(value * 100) / 100,
      label: monthChartLabel[month] ?? month.slice(0, 3),
      frontColor: primaryColor,
    };
  });

  const hasPositive = points.some((point) => point.value > 0);
  const hasNegative = points.some((point) => point.value < 0);
  const chartAllNegative = hasNegative && !hasPositive;

  const barChartData = chartAllNegative
    ? points.map((point) => ({
        ...point,
        rawValue: point.value,
        value: Math.abs(point.value),
      }))
    : points;

  const displayMax = barChartData.reduce(
    (max, point) => Math.max(max, point.value),
    0,
  );
  const sourceMin = points.reduce((min, point) => Math.min(min, point.value), 0);
  const sourceMax = points.reduce((max, point) => Math.max(max, point.value), 0);

  if (chartAllNegative) {
    const maxValue = roundChartAxisLimit(
      includeReferenceLine
        ? Math.max(displayMax, negativeReference)
        : displayMax,
    );
    return {
      barChartData,
      chartAllNegative: true,
      maxValue,
      stepValue: maxValue / noOfSections,
      mostNegativeValue: undefined,
      noOfSections,
      noOfSectionsBelowXAxis: 0,
      showReferenceLine: includeReferenceLine,
      referenceLinePosition: negativeReference,
    };
  }

  if (hasNegative) {
    const posExtent = roundChartAxisLimit(Math.max(sourceMax, 0));
    const negExtent = roundChartAxisLimit(
      includeReferenceLine
        ? Math.max(Math.abs(sourceMin), negativeReference)
        : Math.abs(sourceMin),
    );
    const axisLimit = Math.max(posExtent, negExtent);
    const referenceLinePosition = Math.max(axisLimit - negativeReference, 0);
    return {
      barChartData,
      chartAllNegative: false,
      maxValue: axisLimit,
      stepValue: axisLimit / noOfSections,
      mostNegativeValue: -axisLimit,
      noOfSections,
      noOfSectionsBelowXAxis: noOfSections,
      showReferenceLine: includeReferenceLine,
      referenceLinePosition,
    };
  }

  const maxValue = roundChartAxisLimit(
    includeReferenceLine
      ? Math.max(displayMax, negativeReference)
      : displayMax,
  );
  return {
    barChartData,
    chartAllNegative: false,
    maxValue,
    stepValue: maxValue / noOfSections,
    mostNegativeValue: undefined,
    noOfSections,
    noOfSectionsBelowXAxis: 0,
    showReferenceLine: includeReferenceLine,
    referenceLinePosition: negativeReference,
  };
}

export default function SummaryMonthlyBarChart({
  data = [],
  title = "Total mensual",
  onRefresh,
  refreshing = false,
  negativeReferenceLine = SUMMARY_CHART_NEGATIVE_REFERENCE_DEFAULT,
  showReferenceLine = true,
  /** When true, renders only the chart card (no outer scroll / pull-to-refresh). */
  embedded = false,
}) {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const chartModel = useMemo(
    () =>
      buildChartModel(
        data,
        theme.colors.primary,
        negativeReferenceLine,
        showReferenceLine,
      ),
    [data, theme.colors.primary, negativeReferenceLine, showReferenceLine],
  );

  const chartWidth = Math.max(windowWidth - 48, 280);

  const chartCard = (
    <View
      style={[
        styles.chartCard,
        embedded && styles.chartCardEmbedded,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {title ? (
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
      ) : null}
      <BarChart
            data={chartModel.barChartData}
            width={chartWidth}
            adjustToWidth
            barWidth={22}
            barBorderRadius={4}
            yAxisColor={theme.colors.border}
            xAxisColor={theme.colors.border}
            rulesColor={theme.colors.border}
            rulesType="solid"
            maxValue={chartModel.maxValue}
            mostNegativeValue={chartModel.mostNegativeValue}
            noOfSections={chartModel.noOfSections}
            noOfSectionsBelowXAxis={chartModel.noOfSectionsBelowXAxis}
            stepValue={chartModel.stepValue}
            autoShiftLabels={false}
            trimYAxisAtTop={false}
            yAxisLabelPrefix={chartModel.chartAllNegative ? "-" : ""}
            yAxisTextStyle={{
              color: theme.colors.textSecondary,
              fontSize: 10,
            }}
            xAxisLabelTextStyle={{
              color: theme.colors.textSecondary,
              fontSize: 10,
            }}
            formatYLabel={(value) =>
              formatChartYLabel(value, {
                signFromPrefix: chartModel.chartAllNegative,
              })
            }
            {...(chartModel.showReferenceLine
              ? {
                  showReferenceLine1: true,
                  referenceLine1Position: chartModel.referenceLinePosition,
                  referenceLine1Config: {
                    color: theme.colors.error,
                    thickness: 1,
                    type: "solid",
                    labelTextStyle: {
                      color: theme.colors.error,
                      fontSize: 10,
                    },
                  },
                }
              : null)}
            renderTooltip={(item) => (
              <View
                style={[
                  styles.chartTooltip,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.chartTooltipText, { color: theme.colors.text }]}
                >
                  {item.label}:{" "}
                  {Number(item.rawValue ?? item.value).toLocaleString("es-ES", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}
          />
    </View>
  );

  if (embedded) {
    return <View style={styles.chartViewEmbedded}>{chartCard}</View>;
  }

  return (
    <View style={styles.chartView}>
      <ScrollView
        style={styles.chartScroll}
        contentContainerStyle={styles.chartScrollContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
      >
        {chartCard}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chartView: {
    flex: 1,
    justifyContent: "flex-start",
  },
  chartViewEmbedded: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chartCardEmbedded: {
    marginBottom: 0,
  },
  chartScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chartScrollContent: {
    paddingBottom: 16,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 16,
    overflow: "hidden",
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  chartTooltip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chartTooltipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
