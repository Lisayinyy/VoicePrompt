// The native app owns the service lifecycle; avoid a second daemon on the same port.
console.error('Voice Prompt 0.6.5: open Voice Prompt.app. It starts its bundled service automatically.');
process.exitCode = 1;
