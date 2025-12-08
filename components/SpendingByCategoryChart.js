import React, { useMemo } from "react";
import { View, Text, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function SpendingByCategoryChart({ expenses }) {
  const { labels, data } = useMemo(() => {
    const totals = {};

    expenses.forEach((expense) => {
      const category = expense.category;
      if (!totals[category]) totals[category] = 0;
      totals[category] += expense.amount;
    });

    const labels = Object.keys(totals);
    const data = labels.map((label) => totals[label]);

    return { labels, data };
  }, [expenses]);

  if (labels.length === 0) {
    return (
      <View style={{ padding: 16 }}>
        <Text>No data available yet.</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        Spending by Category
      </Text>

      <BarChart
        data={{
          labels: labels,
          datasets: [{ data }],
        }}
        width={screenWidth - 32}
        height={250}
        yAxisLabel="$"
        fromZero
        showValuesOnTopOfBars
        chartConfig={{
          backgroundColor: "#fff",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        style={{
          borderRadius: 16,
        }}
      />

      <Text style={{ fontSize: 12, textAlign: "center", marginTop: 5 }}>
        Total amount spent in each category.
      </Text>
    </View>
  );
}
