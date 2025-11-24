<template>
  <div class="app-shell" :class="{ 'app-shell--editor': currentView === 'editor' }">
    <header class="app-header" v-if="currentView !== 'editor'">
      <div class="app-header__content">
        <div>
          <h1>Dashboard POC</h1>
          <p class="tagline">Config-driven LINQ-powered analytics — Vue 3 + TypeScript</p>
        </div>
        <nav class="app-nav">
          <button
            class="app-nav__btn"
            :class="{ 'app-nav__btn--active': currentView === 'dashboard' }"
            @click="currentView = 'dashboard'"
          >
            Dashboard
          </button>
          <button
            class="app-nav__btn"
            :class="{ 'app-nav__btn--active': currentView === 'editor' }"
            @click="currentView = 'editor'"
          >
            Editor
          </button>
        </nav>
      </div>
    </header>
    <main class="app-main" v-if="currentView === 'dashboard'">
      <Dashboard />
    </main>
    <DashboardEditor v-else-if="currentView === 'editor'" @exit="currentView = 'dashboard'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Dashboard from '@/components/Dashboard.vue';
import DashboardEditor from '@/components/editor/DashboardEditor.vue';

type View = 'dashboard' | 'editor';
const currentView = ref<View>('dashboard');
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

.app-shell--editor {
  background: #f1f5f9;
}

.app-header {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  padding: 2rem 3rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.app-header__content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1600px;
  margin: 0 auto;
}

.app-header h1 {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.tagline {
  opacity: 0.9;
  font-weight: 500;
  font-size: 0.875rem;
}

.app-nav {
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.25rem;
  border-radius: 0.5rem;
}

.app-nav__btn {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s ease;
}

.app-nav__btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.app-nav__btn--active {
  background: white;
  color: #3b82f6;
}

.app-main {
  flex: 1;
  padding: 2rem 3rem 3rem;
}

@media (max-width: 768px) {
  .app-header {
    padding: 1.5rem;
  }

  .app-header__content {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .app-main {
    padding: 1.5rem;
  }
}
</style>
