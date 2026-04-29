import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { chartData } from '../data/mockData';
import { colors } from '../theme/colors';

const screenWidth = Dimensions.get('window').width - 40;

export const AvanceScreen = () => {
  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    fillShadowGradientFrom: colors.primary,
    fillShadowGradientTo: colors.primaryLight,
    fillShadowGradientFromOpacity: 0.7,
    fillShadowGradientToOpacity: 0.3,
  };

  const lineChartData = {
    labels: chartData.labels,
    datasets: [
      {
        data: chartData.planned,
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, // warning
        strokeWidth: 2
      },
      {
        data: chartData.executed,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // success
        strokeWidth: 2
      }
    ],
    legend: ["Planificado", "Ejecutado"]
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Avance de Sitios</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Progreso por Día de la Semana</Text>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Comparativa Planificado vs Ejecutado</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Actividades Ejecutadas</Text>
          <BarChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.executed }]
            }}
            width={screenWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 8,
  }
});
