/**
 * SimpleBarChart Component
 * Renders a simple bar chart using PDF primitives
 */

import { View, Text } from "@react-pdf/renderer";
import { styles, calculateBarWidth, getBarColor, formatCurrency } from "~/lib/services/pdf-styles";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  title?: string;
  data: BarData[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
}

export function SimpleBarChart({
  title,
  data,
  maxValue,
  height = 12,
  showValues = true,
}: SimpleBarChartProps) {
  // Calculate max value if not provided
  const max = maxValue || Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <View style={styles.barChart}>
        {data.map((item, index) => {
          const barWidth = calculateBarWidth(item.value, max);
          const barColor = item.color || getBarColor(item.value, max);

          return (
            <View key={index} style={styles.barRow}>
              <Text style={styles.barLabel}>{item.label}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${barWidth}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
              {showValues && (
                <Text style={styles.barValue}>
                  {formatCurrency(Math.abs(item.value), "VND")}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * SimpleHorizontalBar Component
 * Horizontal bar chart for categories
 */

interface SimpleHorizontalBarProps {
  data: BarData[];
  maxValue?: number;
  barHeight?: number;
}

export function SimpleHorizontalBar({
  data,
  maxValue,
  barHeight = 8,
}: SimpleHorizontalBarProps) {
  const max = maxValue || Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <View>
      {data.map((item, index) => {
        const barWidth = calculateBarWidth(item.value, max);
        const barColor = item.color || getBarColor(item.value, max);

        return (
          <View key={index} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9 }}>{item.label}</Text>
              <Text style={{ fontSize: 9, fontWeight: 700 }}>
                {formatCurrency(Math.abs(item.value), "VND")}
              </Text>
            </View>
            <View style={{ height: barHeight, backgroundColor: "#f1f5f9", borderRadius: 2 }}>
              <View
                style={{
                  width: `${barWidth}%`,
                  height: "100%",
                  backgroundColor: barColor,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
