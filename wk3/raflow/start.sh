#!/bin/bash
export RUST_LOG="raflow=info,tungstenite=warn,tokio_tungstenite=warn,tao=warn"
pnpm tauri dev
