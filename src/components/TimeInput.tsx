import type { Component } from 'solid-js';

import { formatTimeTyping, normalizeTime } from '../lib/hours';

const TimeInput: Component<{
  value: string;
  onChange: (v: string) => void;
  warn?: boolean;
  placeholder?: string;
  disabled?: boolean;
}> = (props) => (
  <input
    type="text"
    class="time-input"
    classList={{ warn: props.warn }}
    inputmode="numeric"
    maxLength={5}
    autocomplete="off"
    disabled={props.disabled}
    placeholder={props.placeholder ?? '00:00'}
    value={props.value}
    onInput={(e) => {
      const formatted = formatTimeTyping(e.currentTarget.value);
      e.currentTarget.value = formatted;
      props.onChange(formatted);
    }}
    onBlur={(e) => {
      const norm = normalizeTime(e.currentTarget.value);
      if (norm !== props.value) props.onChange(norm);
    }}
  />
);

export default TimeInput;
