import { useState } from "react";
import { Aperture, AudioLines, CheckCircle2, ChevronLeft, ChevronRight, Clapperboard, Download, Image, Layers3, Lock, SlidersHorizontal, WandSparkles } from "lucide-react";

const groups = [
  { id: "photo", title: "Photo editing", icon: Image, items: [
    ["Crop & resize", "ACTIVE", "Aspect-ratio crop, rotate, flip and output dimensions."],
    ["Retouch & colour", "ACTIVE", "Brightness, contrast, saturation, warmth and soft focus."],
    ["Layers & compositing", "ACTIVE", "Base image plus imported image overlay, opacity and blend modes."],
    ["Text & graphic design", "ACTIVE", "Text overlay, colour and size controls."],
    ["Masks, curves & vector paths", "PLANNED", "Precision selections, masks, curves, gradients, vector shapes and retouch brushes."]
  ]},
  { id: "video", title: "Video editing", icon: Clapperboard, items: [
    ["Preview & clip trim", "ACTIVE", "Single clip playback, IN/OUT points and WebM export."],
    ["Multi-track timeline", "PLANNED", "Video, titles, B-roll and audio tracks with split/ripple edits."],
    ["Transitions & speed", "PLANNED", "Transitions, speed ramps, freeze frames and stabilization."],
    ["Colour grading & captions", "PLANNED", "Scopes, LUTs, caption tracks and chroma key."]
  ]},
  { id: "audio", title: "Audio editing", icon: AudioLines, items: [
    ["Audio asset library", "ACTIVE", "Upload and organize music, voiceovers and sound effects."],
    ["Waveform & trimming", "PLANNED", "Waveform timeline, clip trims and fades."],
    ["Mixing & mastering", "PLANNED", "Track mixing, EQ, compression, noise reduction and ducking."]
  ]},
  { id: "motion", title: "Animation & motion graphics", icon: Layers3, items: [
    ["Keyframes & motion paths", "PLANNED", "Animate position, scale, rotation and opacity."],
    ["Titles & compositing", "PLANNED", "Animated titles, masks, tracking and layered scenes."]
  ]},
  { id: "ai", title: "AI-powered editing", icon: WandSparkles, items: [
    ["Background & object tools", "DISABLED", "Background removal, object cleanup, inpainting and generative fill."],
    ["Enhancement & automation", "DISABLED", "Upscaling, auto captions, scene detection and smart edits."],
    ["Model providers", "DISABLED", "Provider-neutral adapters; no provider or API key is active in this workspace."]
  ]},
  { id: "export", title: "Export & project management", icon: Download, items: [
    ["Save new exports", "ACTIVE", "Preserve originals and save edited image/video outputs to Studio Assets."],
    ["Project files & autosave", "PLANNED", "Editable project documents, autosave, versions and recovery."],
    ["Render presets & queue", "PLANNED", "Resolution, frame rate, codecs, quality presets and batch rendering."]
  ]},
  { id: "pro", title: "Professional & advanced", icon: SlidersHorizontal, items: [
    ["Precision tools", "PLANNED", "Masks, curves, perspective, tracking, scopes and advanced retouching."],
    ["Production workflow", "PLANNED", "Proxy media, multicam, collaboration, asset relinking and render management."]
  ]}
] as const;

export default function StudioToolSuite() {
  const [open, setOpen] = useState(true);
  return <aside className={"studio-tool-suite " + (open ? "open" : "closed")}>
    <header><div><Aperture size={16}/><strong>EDITING TOOLKIT</strong></div><button onClick={() => setOpen((value) => !value)} aria-label={open ? "Collapse editing tools" : "Expand editing tools"}>{open ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}</button></header>
    {open && <div className="studio-tool-suite-content">
      <p className="studio-tool-suite-intro">Choose a tool group. Available tools are marked; unfinished integrations are clearly identified.</p>
      {groups.map((group) => {
        const Icon = group.icon;
        return <details key={group.id} className="studio-tool-suite-group">
          <summary><Icon size={15}/><span>{group.title}</span><small>{group.items.filter((item) => item[1] === "ACTIVE").length} active</small></summary>
          <div className="studio-tool-suite-items">{group.items.map((item) => <article key={item[0]}>
            <div><strong>{item[0]}</strong><span className={"studio-tool-state " + item[1].toLowerCase()}>{item[1] === "ACTIVE" ? <CheckCircle2 size={11}/> : <Lock size={11}/>} {item[1]}</span></div>
            <p>{item[2]}</p>
          </article>)}</div>
        </details>;
      })}
    </div>}
  </aside>;
}
