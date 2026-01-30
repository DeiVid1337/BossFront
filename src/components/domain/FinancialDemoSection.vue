<script setup lang="ts">
/**
 * Demonstração financeira (mock) — será implementada no futuro.
 * Gráficos em SVG/CSS, design alinhado ao dashboard Boss Pods.
 */

import { computed } from 'vue'

// Mock: últimos 6 meses
const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const revenueByMonth = [42, 58, 51, 72, 68, 85] // k
const expensesByMonth = [28, 35, 32, 45, 42, 48]

const totalRevenue = computed(() =>
  revenueByMonth.reduce((a, b) => a + b, 0)
)
const totalExpenses = computed(() =>
  expensesByMonth.reduce((a, b) => a + b, 0)
)
const profit = computed(() => totalRevenue.value - totalExpenses.value)
const marginPercent = computed(() =>
  totalRevenue.value > 0
    ? Math.round((profit.value / totalRevenue.value) * 100)
    : 0
)

// Normalizar para SVG (altura ~120)
const maxVal = Math.max(...revenueByMonth, ...expensesByMonth)
const norm = (v: number) => (v / maxVal) * 100

// Donut: composição das despesas (mock)
const expenseCategories = [
  { label: 'Produtos', value: 45, color: '#E70000' },
  { label: 'Operacional', value: 25, color: '#FF7F00' },
  { label: 'Pessoal', value: 20, color: '#FFD700' },
  { label: 'Outros', value: 10, color: 'rgba(255,255,255,0.4)' },
]
const totalCat = expenseCategories.reduce((a, x) => a + x.value, 0)

function formatBRL(k: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(k * 1000)
}
</script>

<template>
  <section class="financial-demo">
    <div class="financial-demo-header">
      <div class="title-row">
        <h2 class="section-title">Demonstração Financeira</h2>
        <span class="badge-preview">Preview — dados simulados</span>
      </div>
      <p class="section-subtitle">
        Visão consolidada de receita, despesas e lucro. Implementação completa em breve.
      </p>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-revenue">
        <div class="kpi-icon">↑</div>
        <div class="kpi-content">
          <span class="kpi-label">Receita (6 meses)</span>
          <span class="kpi-value">{{ formatBRL(totalRevenue) }}</span>
        </div>
      </div>
      <div class="kpi-card kpi-expenses">
        <div class="kpi-icon">↓</div>
        <div class="kpi-content">
          <span class="kpi-label">Despesas (6 meses)</span>
          <span class="kpi-value">{{ formatBRL(totalExpenses) }}</span>
        </div>
      </div>
      <div class="kpi-card kpi-profit">
        <div class="kpi-icon">◆</div>
        <div class="kpi-content">
          <span class="kpi-label">Lucro</span>
          <span class="kpi-value">{{ formatBRL(profit) }}</span>
        </div>
      </div>
      <div class="kpi-card kpi-margin">
        <div class="kpi-icon">%</div>
        <div class="kpi-content">
          <span class="kpi-label">Margem</span>
          <span class="kpi-value">{{ marginPercent }}%</span>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="charts-row">
      <!-- Receita x Despesas (área) -->
      <div class="chart-card chart-main">
        <h3 class="chart-title">Receita vs Despesas (últimos 6 meses)</h3>
        <div class="chart-svg-wrap">
          <svg viewBox="0 0 320 140" class="chart-svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FFD700" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#FFD700" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#E70000" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#E70000" stop-opacity="0" />
              </linearGradient>
            </defs>
            <!-- Grid lines -->
            <line v-for="i in 4" :key="'h' + i" :y1="28 * i" :y2="28 * i" x1="40" x2="300" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
            <line v-for="i in 6" :key="'v' + i" :x1="40 + (260 / 6) * i" :x2="40 + (260 / 6) * i" y1="0" y2="112" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
            <!-- Area Revenue -->
            <path
              :d="`M 40 112 L ${months.map((_, i) => `${40 + (260 / 6) * (i + 0.5)} ${112 - norm(revenueByMonth[i] ?? 0)}`).join(' L ')} L 300 112 Z`"
              fill="url(#gradRevenue)"
            />
            <!-- Line Revenue -->
            <polyline
              :points="months.map((_, i) => `${40 + (260 / 6) * (i + 0.5)},${112 - norm(revenueByMonth[i] ?? 0)}`).join(' ')"
              fill="none"
              stroke="#FFD700"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Area Expenses -->
            <path
              :d="`M 40 112 L ${months.map((_, i) => `${40 + (260 / 6) * (i + 0.5)} ${112 - norm(expensesByMonth[i] ?? 0)}`).join(' L ')} L 300 112 Z`"
              fill="url(#gradExpenses)"
            />
            <!-- Line Expenses -->
            <polyline
              :points="months.map((_, i) => `${40 + (260 / 6) * (i + 0.5)},${112 - norm(expensesByMonth[i] ?? 0)}`).join(' ')"
              fill="none"
              stroke="#E70000"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-dasharray="4 3"
            />
            <!-- Labels -->
            <text v-for="(m, i) in months" :key="m" :x="40 + (260 / 6) * (i + 0.5)" y="128" text-anchor="middle" class="chart-axis-label">{{ m }}</text>
          </svg>
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot revenue"></span> Receita</span>
          <span class="legend-item"><span class="legend-dot expenses"></span> Despesas</span>
        </div>
      </div>

      <!-- Donut: composição despesas -->
      <div class="chart-card chart-donut">
        <h3 class="chart-title">Composição das despesas</h3>
        <div class="donut-wrap">
          <svg viewBox="0 0 100 100" class="donut-svg">
            <defs>
              <filter id="donut-shadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.2" />
              </filter>
            </defs>
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" />
            <template v-for="(cat, i) in expenseCategories" :key="cat.label">
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                :stroke="cat.color"
                stroke-width="12"
                stroke-linecap="round"
                :stroke-dasharray="(cat.value / totalCat) * 264"
                :stroke-dashoffset="expenseCategories.slice(0, i).reduce((a, c) => a + (c.value / totalCat) * 264, 0)"
                transform="rotate(-90 50 50)"
                filter="url(#donut-shadow)"
              />
            </template>
          </svg>
        </div>
        <ul class="donut-legend">
          <li v-for="cat in expenseCategories" :key="cat.label" class="donut-legend-item">
            <span class="donut-dot" :style="{ background: cat.color }"></span>
            <span>{{ cat.label }}</span>
            <span class="donut-pct">{{ cat.value }}%</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Barras: receita por mês -->
    <div class="chart-card chart-bars">
      <h3 class="chart-title">Receita por mês (R$ mil)</h3>
      <div class="bars-wrap">
        <div
          v-for="(val, i) in revenueByMonth"
          :key="i"
          class="bar-item"
        >
          <div
            class="bar-fill"
            :style="{ height: norm(val) + '%' }"
          ></div>
          <span class="bar-label">{{ months[i] }}</span>
          <span class="bar-value">{{ val }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.financial-demo {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 28px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(231, 0, 0, 0.04);
  margin-top: 32px;
}

@media (min-width: 640px) {
  .financial-demo {
    padding: 36px 32px;
    margin-top: 40px;
  }
}

@media (min-width: 1024px) {
  .financial-demo {
    padding: 44px 40px;
    margin-top: 48px;
  }
}

.financial-demo-header {
  margin-bottom: 28px;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.section-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  background: linear-gradient(135deg, #FFD700 0%, #FF7F00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 640px) {
  .section-title {
    font-size: 26px;
  }
}

.badge-preview {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 999px;
}

.section-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.5;
}

/* KPI grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

@media (min-width: 640px) {
  .kpi-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-bottom: 32px;
  }
}

.kpi-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.kpi-revenue .kpi-icon { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
.kpi-expenses .kpi-icon { background: rgba(231, 0, 0, 0.2); color: #E70000; }
.kpi-profit .kpi-icon { background: rgba(0, 200, 100, 0.2); color: #00c864; }
.kpi-margin .kpi-icon { background: rgba(255, 127, 0, 0.2); color: #FF7F00; }

.kpi-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.kpi-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
}

.kpi-value {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

@media (min-width: 640px) {
  .kpi-value {
    font-size: 18px;
  }
}

/* Charts row */
.charts-row {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 24px;
}

@media (min-width: 1024px) {
  .charts-row {
    flex-direction: row;
    gap: 28px;
    margin-bottom: 28px;
  }
}

.chart-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 20px;
}

.chart-main {
  flex: 1;
  min-width: 0;
}

.chart-donut {
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .chart-donut {
    width: 280px;
  }
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px 0;
}

.chart-svg-wrap {
  width: 100%;
  max-width: 100%;
  aspect-ratio: 320/140;
}

.chart-svg {
  width: 100%;
  height: auto;
}

.chart-svg :deep(.chart-axis-label) {
  fill: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  font-family: Inter, system-ui, sans-serif;
}

.chart-legend {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.revenue { background: #FFD700; }
.legend-dot.expenses { background: #E70000; }

/* Donut */
.donut-wrap {
  width: 140px;
  height: 140px;
  margin: 0 auto 16px;
}

.donut-svg {
  width: 100%;
  height: 100%;
}

.donut-legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  justify-content: center;
}

.donut-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.donut-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.donut-pct {
  font-weight: 600;
  color: #fff;
  margin-left: 2px;
}

/* Bars */
.chart-bars {
  margin-bottom: 0;
}

.bars-wrap {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 140px;
  padding-top: 8px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bar-fill {
  width: 100%;
  max-width: 36px;
  min-height: 4px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(180deg, #FFD700 0%, #FF7F00 100%);
  transition: height 0.5s ease;
}

.bar-label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.bar-value {
  font-size: 13px;
  font-weight: 700;
  color: #FFD700;
}
</style>
