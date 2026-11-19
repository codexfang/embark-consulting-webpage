# Embark Consulting Group: Website

Dark, cinematic static site for Embark Consulting Group (UC Berkeley), a technical consulting org for the humanoid robotics industry.

## Run it
    python3 -m http.server 8000   # then visit http://localhost:8000

## What's inside
- **Hero:** humanoid bust whose head and visor track your cursor. Click it and it talks (typed subtitles, audio waveform, lit mouth grille).
- **Thesis:** paragraph that lights up word by word as you scroll.
- **Dialogue:** two rigged humanoids hold a scripted conversation with speech bubbles and a live transcript, then shake hands.
- **Manipulation Lab:** industrial robotic arm driven by real inverse kinematics. It runs a pick-and-place routine on its own. Hover over it to take control; click to grip and release (the cube has gravity).
- **Process:** a humanoid with a procedural walk cycle that walks as you scroll and turns around when you scroll back up.
- Ambient dust, film grain, fog, a custom cursor and a reduced-motion fallback.

## Files
- `index.html`: content and SVG artwork
- `styles.css`: design system and animations
- `script.js`: humanoid rig, IK arm, dialogue engine, walk cycle and interactions

## Customize
- **Team:** names and initials in `#team` (index.html)
- **Email:** replace `embark@example.com`
- **Apply link:** the "Apply now" button in `#join` (currently `href="#"`)
- **Dialogue script:** the `script` array in script.js
- **Hero robot lines:** the `bustLines` array in script.js
- **Contact form:** currently shows a confirmation only; connect it to Formspree / Google Forms (see the TODO in script.js)

## Deploy
GitHub Pages, Netlify Drop or Vercel. Upload the folder as-is; there's no build step.
