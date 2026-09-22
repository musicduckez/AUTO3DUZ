# Birthday video — Индира Жемчужинка

Поздравление с днём рождения от **Елены** подруге **Индире Жемчужинке**.

## Что внутри

- `indira-zhemchuzhinka-birthday.mp4` — готовое видео (~45 сек, 1080p)
- `index.html` — красивая страница-открытка с тем же вайбом
- `assets/` — кадры
- `audio/` — озвучка
- `build_video.py` — скрипт пересборки

## Как открыть

Откройте `birthday-indira/index.html` в браузере или скачайте MP4 и отправьте Индире.

## Пересборка

```bash
cd birthday-indira
python3 build_video.py
```

Нужны: `ffmpeg`, `ffprobe`, `gtts-cli` (для новой озвучки).
