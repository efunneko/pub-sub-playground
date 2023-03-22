// sessions.js - This file contains all the implementation for managing sessions
//               Sessions are used to store the state of the world. They can be
//               saved to a file, loaded from a file, or loaded from a URL. They
//               are stored in the browser's local storage.


export class Sessions {
  constructor(app, sessionConfig) {
    this.app = app;
    this.sessions = [];
    this.undoStack = [];
    this.currentSession = null;

    this.setFullConfig(sessionConfig);
    //this.loadSessions(sessionConfig);

  }

  setFullConfig(sessionConfig) {
    if (sessionConfig) {
      this.sessions       = sessionConfig.sessions;
      let name            = sessionConfig.currentSessionName;
      this.currentSession = this.sessions.find(s => s.name === name);
      if (!this.currentSession) {
        this.currentSession      = this.sessions[0];
        this.currentSession.name = this.currentSession.name || "Unnamed";
      }
    }
    else {      
      this.sessions       = [];
      this.currentSession = {name: "Unnamed", version: 2};
    }
  }

  getFullConfig() {
    return {
      sessions: this.sessions,
      currentSessionName: this.currentSession.name,
    };
  }

  selectSession(name) {
    let session = this.sessions.find(s => s.name === name);
    if (session) {
      this.currentSession = session;
    }
  }

  getSessionNames() {
    return this.sessions.map(s => s.name);
  }

  deleteSession(name) {
    this.sessions = this.sessions.filter(s => s.name !== name);
  }

  getCurrentSessionName() {
    if (this.currentSession) {
      return this.currentSession.name;
    }
    return null;
  }

  setCurrentSessionName(name) {
    this.currentSession.name = name;
  }

  setCurrentSessionConfig(config) {
    Object.assign(this.currentSession, config);
    this.currentSession.name = this.currentSession.name || "Unnamed";
  }

  // Return only the current session config as the full config
  getCurrentSessionConfig() {
    return {
      sessions: [this.currentSession],
      currentSessionName: this.currentSession.name,
    }
  }

  getCurrentSession() {
    return this.currentSession;
  }

  addToUndoStack(config) {
    this.undoStack.push(config);
    if (this.undoStack.length > 30) {
      this.undoStack.shift();      
    }
  }

  getNextUndo() {
    if (this.undoStack.length > 1) {
      this.undoStack.pop();
    }
    return this.undoStack[this.undoStack.length - 1];
  }


}

