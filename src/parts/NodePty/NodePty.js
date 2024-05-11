import { spawn } from "node-pty";
import { VError } from "../VError/VError.js";
import * as Assert from "../Assert/Assert.js";

class DataEvent extends Event {
  constructor(data) {
    super("data");
    this.data = data;
  }
}

class ExitEvent extends Event {
  constructor() {
    super("exit");
  }
}

class Pty extends EventTarget {
  /**
   *
   * @param {import('node-pty').IPty} pty
   */
  constructor(pty) {
    super();
    this.pty = pty;

    const handleData = (data) => {
      this.dispatchEvent(new DataEvent(data));
    };
    const handleExit = () => {
      this.dispatchEvent(new ExitEvent());
    };
    this.pty.onData(handleData);
    this.pty.onExit(handleExit);
  }

  resize(columns, rows){
    this.pty.resize(columns, rows)
  }

  dispose(){
    this.pty.kill()
  }
}

// @ts-ignore
export const create = ({ env = {}, cwd, command, args } = {}) => {
  try {
    Assert.string(cwd);
    Assert.string(command);
    Assert.array(args);
    const pty = spawn(command, args, {
      encoding: null,
      cwd,
      // cols: 10,
      // rows: 10,
    });
    const wrapped = new Pty(pty);
    return wrapped;
  } catch (error) {
    throw new VError(error, `Failed to create terminal`);
  }
};

export const onData = (pty, fn) => {
  Assert.object(pty);
  pty.onData(fn);
};

export const write = (pty, data) => {
  try {
    Assert.object(pty);
    pty.write(data);
  } catch (error) {
    throw new VError(error, `Failed to write data to terminal`);
  }
};

export const resize = (pty, columns, rows) => {
  Assert.object(pty);
  Assert.number(columns);
  Assert.number(rows);
  pty.resize(columns, rows);
};

export const dispose = (pty) => {
  pty.kill();
};
