import { createContext, useContext, type ParentComponent } from 'solid-js';

import type { FileBackend } from '../lib/fileStore';
import type { TimesheetDoc } from '../model/types';
import { createTimesheetStore, type TimesheetStore } from './createTimesheetStore';

const TimesheetContext = createContext<TimesheetStore>();

export const TimesheetProvider: ParentComponent<{
  initialDoc: TimesheetDoc;
  backend: FileBackend;
}> = (props) => {
  const store = createTimesheetStore(props.initialDoc, props.backend);
  return <TimesheetContext.Provider value={store}>{props.children}</TimesheetContext.Provider>;
};

export function useTimesheet(): TimesheetStore {
  const ctx = useContext(TimesheetContext);
  if (!ctx) throw new Error('useTimesheet must be used within a TimesheetProvider');
  return ctx;
}
