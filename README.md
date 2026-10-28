# Видео-скиллы для Claude Code

48 скиллов для создания и монтажа видео, собранных из самых популярных репозиториев GitHub (октябрь 2026).
Лежат в `.claude/skills/` — Claude Code подхватывает их автоматически, если открыть эту папку.

## Установка на свой компьютер (для всех проектов)

```bash
git clone <этот репозиторий> && cd Claude-
./install.sh            # копирует скиллы в ~/.claude/skills
```

Для большинства скиллов нужны **Node.js 20+** и **FFmpeg**; для части — Python 3.10+.

## Что чем пользуются (анализ)

| Движок / набор | ★ GitHub | Для чего | Скиллы здесь |
|---|---:|---|---|
| **HyperFrames** (HeyGen) | ~74k | Видео из HTML/GSAP. Самый популярный рендерер, богатый каталог блоков, но медленный | `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `figma`, `slideshow`, `remotion-to-hyperframes`, `gsap` |
| **OpenMontage** | ~73k | Целая студия: 12 пайплайнов, 140 скиллов. Работает только внутри своего репо — скачан отдельно (см. ниже) | — |
| **video-shotcraft** | ~14k | Кинематографичные промо продуктов на Remotion, 124 «рецепта» кадров, звук, бит-синк | `video-shotcraft` |
| **Remotion (официальные)** | ~5.8k | Видео на React. Самый надёжный базовый вариант | `remotion-best-practices` (роутер), `remotion-create`, `-render`, `-studio`, `-captions`, `-markup`, `-maps`, `-multimedia`, `-saas`, `-docs`, `-upgrade`, `-interactivity` |
| **ffmpeg-skill** | ~3.5k | Локальный монтаж: нарезка, субтитры, рефрейм, громкость, экспорт под платформы | `ffmpeg-skill`, `ffmpeg` |
| **anything2explainer** | ~2.8k | Тема → объясняющее видео с озвучкой и субтитрами | `anything2explainer` |
| **digitalsamba toolkit** | ~2.4k | Remotion + ElevenLabs + FFmpeg + запись экрана + AI-генерация | `remotion`, `elevenlabs`, `playwright-recording`, `synthetic-ui-demo`, `moviepy`, `ltx2`, `acestep`, `ideogram4`, `qwen-edit`, `runpod`, `frontend-design` |
| **Herk Edit Kit** | ~2.3k | Монтаж «говорящей головы», Reels/Shorts, вырезка пауз и оговорок | `edit-video`, `cut-silences`, `cut-mistakes`, `short-form-edit`, `make-a-video`, `motion-showreel`, `video-storytelling`, `hyperframes-video-beats`, `style-library`, `website-to-hyperframes` |
| **onetake** | ~2k | Короткие продуктовые ролики «одним дублем» (🥈 в независимом тесте) | `onetake` |
| **video-talkcraft** | ~1.9k | Озвучка с пословной синхронизацией + моушн-дизайн | `video-talkcraft` |
| **explainroo** | ~0.5k | Самый быстрый готовый ролик с озвучкой (🥇 в независимом тесте, 2 мин) | `explainroo` |

Независимый тест 16 скиллов ([awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)) показал:
все справились; быстрее всех — explainroo (2 мин), Remotion — 4.5 мин, HyperFrames — 23.5 мин.

## С чего начать

- **Просто сделать ролик:** «make a video про …» → `make-a-video` или `explainroo`
- **Промо продукта:** `video-shotcraft` или `onetake`
- **Своё на React:** `remotion-best-practices`
- **Монтаж своего видео:** `edit-video`, `short-form-edit`, `ffmpeg-skill`
- **Объясняющее видео с озвучкой:** `anything2explainer`, `video-talkcraft`

Скиллы `elevenlabs`, `ltx2`, `runpod`, `ideogram4`, `qwen-edit` требуют платных API-ключей.

## Источники

[remotion-dev/skills](https://github.com/remotion-dev/skills) ·
[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) ·
[calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) ·
[Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) ·
[Vincentwei1021/video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) ·
[Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer) ·
[kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) ·
[nateherkai/herk-edit-kit](https://github.com/nateherkai/herk-edit-kit) ·
[digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) ·
[feitangyuan/onetake](https://github.com/feitangyuan/onetake) ·
[vincentsch/explainroo](https://github.com/vincentsch/explainroo)

OpenMontage — полноценное приложение, его клонируют целиком:
`git clone https://github.com/calesthio/OpenMontage` и открывают Claude Code в этой папке.
