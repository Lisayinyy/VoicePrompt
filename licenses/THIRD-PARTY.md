# Third-party components

Voice Prompt is an independent product and is not endorsed by these projects.

- SenseVoiceSmall, FunAudioLLM: original multilingual speech recognition model, redistributed as Q8 GGUF conversion from https://huggingface.co/handy-computer/SenseVoiceSmall-gguf at revision 4a08b8e900b38a977e32eb08d5d0697d6e72ba04. The model retains its original name. See SenseVoiceSmall-MODEL_LICENSE.txt (FunASR Model Open Source License Agreement v1.1).
- transcribe.cpp, https://github.com/handy-computer/transcribe.cpp, commit e2f82cb6702315a1194f3bf1a6fee67cd2678447. MIT, see transcribe.cpp-LICENSE.txt.
- ggml included in that source tree. MIT, see ggml-LICENSE.txt.
- Node.js, https://nodejs.org. See Node-LICENSE.txt for Node and all bundled third-party notices. Exact version and hashes are in components.json.

The user-facing name is Voice Prompt. Upstream names remain here for attribution.

The Node, transcribe.cpp and ggml license files and components.json mentioned above are included in the built desktop bundle by scripts/build-runtime.py. The Git source repository does not redistribute those binaries.

## Optional Qwen local recognition (0.7.0)

These components are downloaded separately by `scripts/setup-local-asr.py`; they are not included in the connector or Git source. Dependencies remain under their upstream licenses.

- Qwen3-ASR: https://huggingface.co/Qwen/Qwen3-ASR-1.7B
- MLX conversion: https://huggingface.co/mlx-community/Qwen3-ASR-1.7B-8bit, revision `a8379a2e2f9e313c9292cdf1af4055ab56d50d55`. Weight SHA-256: `bf304b009cc7eca79283056f787b44c952d24ac22cec787b39732bba3c23c13c`.
- MLX Audio 0.5.3: https://github.com/Blaizzy/mlx-audio
- MLX 0.32.2: https://github.com/ml-explore/mlx
- Exact Python dependency versions are recorded in `plugin/asr/requirements.lock`.
