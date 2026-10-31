import { useState } from "react";
import { Aperture, AudioLines, CheckCircle2, ChevronLeft, ChevronRight, Clapperboard, Download, Image, Layers3, Lock, SlidersHorizontal, WandSparkles } from "lucide-react";

const groups = [
  { id: "photo", title: "Photo editing", icon: Image, items: [
    ["Freeform crop & resize", "ACTIVE", "Drag a precise crop region on the canvas, apply it across layers, rotate, flip and resize output."],
    ["Brush eraser & colour removal", "ACTIVE", "Erase pixels with a brush or remove connected background-colour regions using adjustable tolerance; plus colour adjustments."],
    ["Multi-layer compositing", "ACTIVE", "Add multiple image layers, select, hide, delete, adjust opacity and use blend modes."],
    ["Text & graphic design", "ACTIVE", "Text overlay, colour and size controls."],
    ["Masks, curves & precision retouch", "PLANNED", "Non-destructive layer masks, curves, healing/clone brushes, gradients, vector paths and advanced selections."]
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
    ["Keyframed titles & shape layers", "ACTIVE", "Animate text and vector-style shape layers with position, scale, rotation, opacity and easing."],
    ["Timeline & motion paths", "ACTIVE", "Scrub and preview timed layer tracks with start/end points and easing interpolation."],
    ["Composition presets & guides", "ACTIVE", "Landscape, portrait and square canvas formats with safe-area and centre guides."],
    ["WebM & PNG rendering", "ACTIVE", "Render browser-based motion graphics to WebM and export still frames as PNG."],
    ["Masks, tracking & 3D scenes", "PLANNED", "Advanced masks, motion tracking, 3D cameras, particle systems and compositing."]
  ]},
  { id: "ai", title: "AI-powered editing", icon: WandSparkles, items: [
    ["Semantic background & object tools", "DISABLED", "AI subject selection, one-click background removal, object cleanup, inpainting and generative fill. Colour-based background removal is available in manual tools."],
    ["Enhancement & automation", "DISABLED", "Upscaling, auto captions, scene detection and smart edits."],
    ["Model providers", "DISABLED", "Provider-neutral adapters; no provider or API key is active in this workspace."]
  ]},
  { id: "export", title: "Export & project management", icon: Download, items: [
    ["Save new exports", "ACTIVE", "Preserve originals and save edited image/video outputs to Studio Assets."],
    ["Project files & autosave", "PLANNED", "Editable project documents, autosave, versions and recovery."],
    ["Render presets & queue", "PLANNED", "Resolution, frame rate, codecs, quality presets and batch rendering."]
  ]},
  { id: "pro", title: "Professional & advanced", icon: SlidersHorizontal, items: [
    ["Motion keyframes & easing", "ACTIVE", "Per-layer start/end animation, linear and eased interpolation, opacity and transform controls."],
    ["Composition & delivery controls", "ACTIVE", "16:9, 9:16 and 1:1 compositions, 24/30/60 fps, safe guides and WebM/PNG output."],
    ["Colour curves, masks & scopes", "PLANNED", "Curves, selective masks, waveform/vectorscope monitoring, LUT management and precision grading."],
    ["Tracking, 3D & production pipeline", "PLANNED", "Object tracking, 3D compositing, proxy media, multicam, render queue and project versioning."]
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
