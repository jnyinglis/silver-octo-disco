<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>Dashboard POC</h1>
      <p class="tagline">Config-driven LINQ-powered analytics — Vue 3 + TypeScript</p>
    </header>
    <main class="app-main">
      <Dashboard />
    </main>
  </div>
</template>

<script setup lang="ts">
import Dashboard from '@/components/Dashboard.vue';
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
  color: #1f2933;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.app-header {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  padding: 2.5rem 3rem 2rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.app-header h1 {
  font-size: 2.25rem;
  margin-bottom: 0.5rem;
}

.tagline {
  opacity: 0.9;
  font-weight: 500;
}

.app-main {
  flex: 1;
  padding: 2rem 3rem 3rem;
}

@media (max-width: 768px) {
  .app-header,
  .app-main {
    padding: 1.5rem;
  }
}
</style>
