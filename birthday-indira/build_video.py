#!/usr/bin/env python3
"""Build a cinematic birthday video for Indira Zhemchuzhinka from Elena."""

from __future__ import annotations

import subprocess
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
AUDIO = ROOT / "audio"
OUT = ROOT / "indira-zhemchuzhinka-birthday.mp4"
ARTIFACT = Path("/opt/cursor/artifacts/indira-zhemchuzhinka-birthday.mp4")
WORK = ROOT / ".work"
WORK.mkdir(exist_ok=True)

FONT_TITLE = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
FONT_BODY = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"

SCENES = [
    {
        "image": "scene1-pearl-ocean.png",
        "audio": "01.mp3",
        "title": "ЭКСТРЕННЫЙ ВЫПУСК",
        "subtitle": "Найдена Жемчужинка года…",
        "min_dur": 7.5,
    },
    {
        "image": "scene2-pearl-celebrity.png",
        "audio": "02.mp3",
        "title": "ИНДИРА ЖЕМЧУЖИНКА",
        "subtitle": "Официально самая сияющая подруга Вселенной",
        "min_dur": 8.0,
    },
    {
        "image": "scene3-friends.png",
        "audio": "03.mp3",
        "title": "ОТ ЕЛЕНЫ",
        "subtitle": "С любовью, смехом и лёгким безумием",
        "min_dur": 8.0,
    },
    {
        "image": "scene4-pearl-cake.png",
        "audio": "04.mp3",
        "title": "СЕКРЕТ ВОЗРАСТА",
        "subtitle": "Это просто счётчик твоих обворожений",
        "min_dur": 8.0,
    },
    {
        "image": "scene5-finale.png",
        "audio": "05.mp3",
        "title": "С ДНЁМ РОЖДЕНИЯ!",
        "subtitle": "Сияй ещё ярче, Жемчужинка  ·  твоя Елена",
        "min_dur": 9.5,
    },
]


def ffprobe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def escape_drawtext(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )


def wrap_subtitle(text: str, width: int = 38) -> str:
    return "\n".join(textwrap.wrap(text, width=width))


def make_music(path: Path, duration: float) -> None:
    # Soft pearl-ambient pad: layered gentle tones + filtered noise shimmer
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency=220:duration={duration}",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency=330:duration={duration}",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency=440:duration={duration}",
        "-f",
        "lavfi",
        "-i",
        f"anoisesrc=color=pink:amplitude=0.015:duration={duration}",
        "-filter_complex",
        (
            "[0:a]volume=0.045,afade=t=in:st=0:d=2,afade=t=out:st={d}:d=2[a0];"
            "[1:a]volume=0.03,afade=t=in:st=0:d=3,afade=t=out:st={d}:d=2[a1];"
            "[2:a]volume=0.018,tremolo=f=0.15:d=0.4,afade=t=in:st=0:d=2,afade=t=out:st={d}:d=2[a2];"
            "[3:a]highpass=f=800,lowpass=f=4000,volume=0.35,afade=t=in:st=0:d=1,afade=t=out:st={d}:d=2[a3];"
            "[a0][a1][a2][a3]amix=inputs=4:normalize=0,alimiter=limit=0.25"
        ).format(d=max(duration - 2, 0.5)),
        "-t",
        str(duration),
        str(path),
    ]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def render_scene(idx: int, scene: dict) -> tuple[Path, float]:
    img = ASSETS / scene["image"]
    voice = AUDIO / scene["audio"]
    voice_dur = ffprobe_duration(voice)
    dur = max(scene["min_dur"], voice_dur + 1.4)
    out = WORK / f"scene_{idx:02d}.mp4"

    title = escape_drawtext(scene["title"])
    subtitle = escape_drawtext(wrap_subtitle(scene["subtitle"]))

    # Ken Burns zoom + soft vignette + elegant text
    # frames = dur * fps
    fps = 30
    frames = int(dur * fps)
    vf = (
        f"scale=1920:1080:force_original_aspect_ratio=increase,"
        f"crop=1920:1080,"
        f"zoompan=z='min(1.12,1+0.00035*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps={fps},"
        f"eq=saturation=1.05:brightness=0.02,"
        f"vignette=PI/5,"
        f"drawbox=x=0:y=ih-220:w=iw:h=220:color=black@0.35:t=fill,"
        f"drawtext=fontfile={FONT_TITLE}:text='{title}':fontsize=54:fontcolor=0xFFF8F0:"
        f"borderw=0:shadowcolor=black@0.45:shadowx=0:shadowy=3:"
        f"x=(w-text_w)/2:y=h-185:alpha='if(lt(t,0.4),0,if(lt(t,1.1),(t-0.4)/0.7,1))',"
        f"drawtext=fontfile={FONT_BODY}:text='{subtitle}':fontsize=30:fontcolor=0xF5E6D3:"
        f"line_spacing=10:shadowcolor=black@0.4:shadowx=0:shadowy=2:"
        f"x=(w-text_w)/2:y=h-115:alpha='if(lt(t,0.7),0,if(lt(t,1.4),(t-0.7)/0.7,1))'"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(img),
        "-i",
        str(voice),
        "-filter_complex",
        (
            f"[0:v]{vf},fade=t=in:st=0:d=0.7,fade=t=out:st={dur-0.7:.2f}:d=0.7[v];"
            f"[1:a]aformat=sample_rates=44100:channel_layouts=stereo,"
            f"adelay=600|600,afade=t=in:st=0:d=0.2,afade=t=out:st={voice_dur-0.25:.2f}:d=0.25,"
            f"apad=whole_dur={dur}[a]"
        ),
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-t",
        str(dur),
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-b:a",
        "192k",
        str(out),
    ]
    subprocess.check_call(cmd)
    return out, dur


def concat_scenes(paths: list[Path], out: Path) -> None:
    list_file = WORK / "concat.txt"
    list_file.write_text("".join(f"file '{p}'\n" for p in paths), encoding="utf-8")
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(out),
        ]
    )


def mix_music(video: Path, music: Path, out: Path) -> None:
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video),
            "-i",
            str(music),
            "-filter_complex",
            "[0:a]volume=1.0[va];[1:a]volume=0.22[ma];[va][ma]amix=inputs=2:duration=first:dropout_transition=2[a]",
            "-map",
            "0:v",
            "-map",
            "[a]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            str(out),
        ]
    )


def main() -> None:
    rendered: list[Path] = []
    total = 0.0
    for i, scene in enumerate(SCENES, start=1):
        print(f"Rendering scene {i}/{len(SCENES)}…")
        path, dur = render_scene(i, scene)
        rendered.append(path)
        total += dur

    silent = WORK / "concat_raw.mp4"
    concat_scenes(rendered, silent)

    music = WORK / "ambient.m4a"
    print("Generating ambient music…")
    make_music(music, total + 1)

    final_tmp = WORK / "final_tmp.mp4"
    print("Mixing voice + music…")
    mix_music(silent, music, final_tmp)

    # Tiny intro title card
    intro = WORK / "intro.mp4"
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=0x1A1410:s=1920x1080:d=3.2",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo",
            "-vf",
            (
                f"drawtext=fontfile={FONT_TITLE}:text='ЕЛЕНА':fontsize=36:fontcolor=0xE8D5C4:"
                f"x=(w-text_w)/2:y=h/2-90:alpha='if(lt(t,0.3),0,if(lt(t,0.9),(t-0.3)/0.6,1))',"
                f"drawtext=fontfile={FONT_TITLE}:text='поздравляет':fontsize=28:fontcolor=0xC9B8A6:"
                f"x=(w-text_w)/2:y=h/2-40:alpha='if(lt(t,0.5),0,if(lt(t,1.1),(t-0.5)/0.6,1))',"
                f"drawtext=fontfile={FONT_TITLE}:text='ИНДИРУ ЖЕМЧУЖИНКУ':fontsize=64:fontcolor=0xFFF5EA:"
                f"x=(w-text_w)/2:y=h/2+20:alpha='if(lt(t,0.8),0,if(lt(t,1.5),(t-0.8)/0.7,1))',"
                f"fade=t=out:st=2.5:d=0.7"
            ),
            "-t",
            "3.2",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-shortest",
            str(intro),
        ]
    )

    # Normalize both to same timebase before concat filter
    intro_n = WORK / "intro_n.mp4"
    body_n = WORK / "body_n.mp4"
    for src, dst in ((intro, intro_n), (final_tmp, body_n)):
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(src),
                "-r",
                "30",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "18",
                "-c:a",
                "aac",
                "-ar",
                "44100",
                "-ac",
                "2",
                "-b:a",
                "192k",
                str(dst),
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(intro_n),
            "-i",
            str(body_n),
            "-filter_complex",
            "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(OUT),
        ]
    )
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_bytes(OUT.read_bytes())
    print(f"Done: {OUT}")
    print(f"Artifact: {ARTIFACT}")
    print(f"Duration ~ {total + 3.2:.1f}s")


if __name__ == "__main__":
    main()
