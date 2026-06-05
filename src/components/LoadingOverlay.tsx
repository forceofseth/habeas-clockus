import type { Component } from 'solid-js';

const LoadingOverlay: Component<{ message?: string }> = (props) => (
  <div class="loading-overlay">
    <div class="spinner" />
    <p>{props.message ?? 'Feiertage werden geladen …'}</p>
  </div>
);

export default LoadingOverlay;
