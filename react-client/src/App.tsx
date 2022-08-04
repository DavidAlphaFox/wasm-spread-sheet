import React from "react";
import { match, P } from "ts-pattern";
import "./App.css";
import { DataStatus, DataStatusManager, Metadata, MetadataManager } from "./components.interface";
import { DataHandler } from "./frame/table-ui";
import SideBar from "./layout/side-bar";
import { dataWorker } from "./reader";
import { WorkerRecMessage } from "./worker.interface";

export const dataStatusContext = React.createContext({} as DataStatusManager);
export const metadataContext = React.createContext({} as MetadataManager);
export const workerDataContext = React.createContext({} as WorkerOnMessageManager);

interface WorkerDataState {
  progress: number;
  chunk: string[][];
  header: string[];
  names: string[];
  result: string;
}
interface WorkerOnMessageManager {
  workerDataState: WorkerDataState;
  setWorkerDataState: (action: WorkerRecMessage) => void;
}
const reducer = (state: WorkerDataState, action: WorkerRecMessage): WorkerDataState => {
  return match(action)
    .with({ type: "parsing", payload: P.select() }, ({ progress }) => {
      return { ...state, progress };
    })
    .with({ type: "chunk", payload: P.select() }, (payload) => {
      const chunk = payload.map((column) => column.split("DELIMITER_TOKEN"));
      return { ...state, chunk };
    })
    .with({ type: "header", payload: P.select() }, (header) => {
      return { ...state, header };
    })
    .with({ type: "sumCol", payload: P.select() }, (result) => {
      return { ...state, result };
    })
    .with({ type: "names", payload: P.select() }, (names) => {
      return { ...state, names };
    })
    .run();
};

function App() {
  const [dataStatus, setDataStatus] = React.useState<DataStatus>("Empty");
  const [metadata, setMetadata] = React.useState<Metadata>({
    headerChecked: true,
    headerCheckBoxDisabled: false,
    selectedId: 0,
  });
  const [state, dispatch] = React.useReducer(reducer, {
    progress: 0,
    chunk: [],
    header: [],
    names: [],
    result: "",
  });

  const dataStatusManager: DataStatusManager = {
    dataStatus: dataStatus,
    setDataStatus: (input: DataStatus) => setDataStatus(input),
  };

  const metadataManager: MetadataManager = {
    metadata: metadata,
    setMetadata: (input: Metadata) => setMetadata(input),
  };

  dataWorker.onmessage = ({ data }: { data: WorkerRecMessage }) => {
    match(data)
      .with({ type: "chunk", payload: P.select() }, (payload) => {
        dispatch({ type: "chunk", payload });
      })
      .with({ type: "header", payload: P.select() }, (payload) => {
        dispatch({ type: "header", payload });
      })
      .with({ type: "parsing", payload: P.select() }, (payload) => {
        dispatch({ type: "parsing", payload });
      })
      .with({ type: "sumCol", payload: P.select() }, (payload) => {
        dispatch({ type: "sumCol", payload });
      })
      .with({ type: "names", payload: P.select() }, (payload) => {
        dispatch({ type: "names", payload });
      })
      .with({ type: "addFilter", payload: P.select() }, ({ names }) => {
        setMetadata({ ...metadata, selectedId: metadata.selectedId + 1 });
        dispatch({ type: "names", payload: names });
      })
      .otherwise(() => console.log("Unexpected action"));
  };

  const workerDataManager: WorkerOnMessageManager = {
    workerDataState: state,
    setWorkerDataState: dispatch,
  };

  return (
    <div className="App">
      <metadataContext.Provider value={metadataManager}>
        <dataStatusContext.Provider value={dataStatusManager}>
          <workerDataContext.Provider value={workerDataManager}>
            <SideBar />
            <header className="App-header">
              <DataHandler />
            </header>
          </workerDataContext.Provider>
        </dataStatusContext.Provider>
      </metadataContext.Provider>
    </div>
  );
}

export default App;
