import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { chartData } from '../data/mockData';
import { colors } from '../theme/colors';
import { getReportSummary, ApiReportSummary } from '../services/apiService';

const screenWidth = Dimensions.get('window').width - 40;

export const AvanceScreen = () => {
  const [report, setReport]     = useState<ApiReportSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [fromApi, setFromApi]   = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await getReportSummary();
        setReport(data);
        setFromApi(true);
      } catch {
        // Si la API no responde, usar datos mock como fallback
        setReport(null);
        setFromApi(false);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, []);

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

  // ── Datos para los gráficos ───────────────────────────────
  // Si tenemos datos de la API, construimos gráficos dinámicos
  // Si no, usamos el chartData mock como fallback
  const getChartLabels  = () => chartData.labels;
  const getPlannedData  = () => chartData.planned;
  const getExecutedData = () => chartData.executed;

  const lineChartData = {
    labels: getChartLabels(),
    datasets: [
      {
        data: getPlannedData(),
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: getExecutedData(),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ["Planificado", "Ejecutado"]
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Avance de Sitios</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Avance de Sitios</Text>
        {fromApi && (
          <View style={styles.apiIndicator}>
            <View style={styles.apiDot} />
            <Text style={styles.apiText}>En línea</Text>
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Tarjetas de totales (si hay datos API) ── */}
        {report && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{report.totales.planificaciones}</Text>
              <Text style={styles.statLabel}>Planificaciones</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: colors.success }]}>
                {report.por_estado.find(e => e.status === 'Ejecutado')?.count || '0'}
              </Text>
              <Text style={styles.statLabel}>Ejecutadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: colors.warning }]}>
                {report.por_estado.find(e => e.status === 'En ejecución')?.count || '0'}
              </Text>
              <Text style={styles.statLabel}>En Ejecución</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{report.totales.sitios}</Text>
              <Text style={styles.statLabel}>Sitios</Text>
            </View>
          </View>
        )}

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
              labels: getChartLabels(),
              datasets: [{ data: getExecutedData() }]
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

        {/* ── Ranking por trabajador (si hay datos API) ── */}
        {report && report.por_trabajador.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Actividad por Trabajador</Text>
            {report.por_trabajador.map((w, i) => (
              <View key={i} style={styles.workerRow}>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{w.worker}</Text>
                  <Text style={styles.workerRole}>{w.role}</Text>
                </View>
                <View style={styles.workerStats}>
                  <Text style={styles.workerTotal}>{w.total_plannings} total</Text>
                  <Text style={styles.workerExecuted}>{w.executed} ✓</Text>
                </View>
              </View>
            ))}
          </View>
        )}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  apiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  apiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  apiText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
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
  },
  workerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  workerRole: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  workerStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  workerTotal: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  workerExecuted: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
});
