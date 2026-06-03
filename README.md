# memerooms


## AI prompts used for vibe coding this game:

to Gemini 3.5 Flash:
```
provide a prompt for a generative AI LLM that can create a backrooms game playable in the browser using A-Frame.io WebVR or Threejs or more suitable alternative. It would a be first-person perspective game based on the backrooms but with a twist: 3 game modes: horror (that has all the classic cinematic experience and horror elements to make the atmosphere very frightening),  aura (phonk night drive with chill aesthetic low light vibe zone), goofy (comical meme material funky MLG vibes). Each game mode would just change some of the lighting, enemy entities' movement patterns, speed, detection range, etc. For background music, there would be playlists of MP3 files specified for each of the game modes. Can define placeholder filenames for now. The twist is not finished yet! Before beginning a game, players can drag and drop custom images of their own to be used as the flat 2D entities that would be travelling around the 3D map. You know the backrooms and Nico's Nextbots (or garry's mod nextbots PNG entities). That's the "entities" in this backrooms game. Name should be "MemeRooms". Also there can be a feature to allow user to paste their own YouTube playlist to be played as background music if they want to override the MP3 file audios. So this will be a backrooms infinite procedurally generated 3D environment with 2D nextbot entities moving around until they catch a player. They should also have random mutations happening in the goofy gamemode. And for every second when an entity has targeted the player, there should be a score count at the top middle GUI that increases +1. And there would be a player health bar at the bottom middle. Allow jumping and bhop (bunny hop) physics for acceleration. Just like those Roblox games but now in a browser based way. For mobile devices, show a rotate device screen and allow gameplay in landscape mode with joystick and button controls. GUI changed according to gamemode selected. Default: horror (shadows, dark fog, eldritch), aura (cyberpunk, scifi, anime stylish), goofy (MLG, funny, comical). Use multiple fonts respective to gamemode. Use browser persistent storage for having a total statistic of number of minutes gameplay, number of times played, highest 3 scores with timestamps. For a credits section, mention "Made by Claymunza". Make the game look unbelievably good even if it's in a browser and not make it look like a crappy old fashioned website instead!
```

from Gemini 3.5 Flash to v0.app v0 Max:
```
You are an expert WebGL developer, game designer, and senior JavaScript engineer. Your task is to write a complete, production-ready, highly polished browser game named **"MemeRooms"**. 

The game must be visually stunning, using modern web design principles (glassmorphism, clean layouts, smooth CSS transitions) so it feels like a premium desktop application, not a legacy website.

### Core Tech Stack
* **3D Engine:** Three.js (with custom shaders for lighting/fog if needed for performance/looks) or A-Frame.
* **Physics:** Custom responsive controls featuring classic Source Engine-style bunny hopping (bhop) mechanics.
* **UI/UX:** HTML5/CSS3 Grid/Flexbox, TailwindCSS (via CDN) for modern aesthetics, Google Fonts.
* **Persistence:** LocalStorage for game statistics.

---

### GAME MECHANICS & CONTROLS

1. **Movement (Desktop):** WASD for movement, Mouse to look around (PointerLock API). Spacebar to jump. Implement bunny-hopping (bhop) where timed jumps build and maintain momentum/velocity.
2. **Movement (Mobile):** If a mobile device is detected in portrait, show a beautiful modal forcing "Rotate Device to Landscape". Once in landscape, render a smooth, responsive on-screen virtual joystick (left side) and a dedicated Jump button (right side).
3. **Procedural Generation:** An infinite or seamlessly looping/generating 3D grid layout mimicking the Backrooms (infinite yellow wallpaper corridors, fluorescent lights, columns).
4. **Entities (Nextbots):** 2D flat billboards facing the camera (Sprite or Mesh with `lookAt(camera)`). By default, use a placeholder PNG path. They track and pathfind toward the player.
5. **Drag-and-Drop Image Customization:** On the main menu, players can drag and drop their own PNG/JPG images. These images instantly overwrite the 2D Nextbot textures.
6. **Scoring & Health:** * Players have 100 HP. If an entity touches them, HP depletes.
   * A score counter sits at the top-middle. It increases by +1 every second *only* when an entity has successfully targeted and is actively pursuing the player.

---

### THE THREE GAME MODES

The selected mode dynamically alters the entire environment, GUI style, audio, and entity behavior:

| Feature | 💀 Horror Mode (Default) | 🎧 Aura Mode | 🤪 Goofy Mode |
| :--- | :--- | :--- | :--- |
| **Visual Vibe** | Dark, heavy shadows, thick black/green fog, flickering lights. | Cyberpunk, sci-fi, anime synthwave neon, low-light chill zone. | Bright, saturated, flashing MLG colors, chaotic UI elements. |
| **UI Fonts** | Creepy/Gothic (e.g., 'Creepster' or 'Nosifer') | Sleek, futuristic (e.g., 'Orbitron' or 'Rajdhani') | Comic/Funky (e.g., 'Comic Sans', 'Bangers') |
| **Entity Behavior** | Creeping speed, massive detection range, silent stalking. | Steady, smooth pacing, medium detection range. | Hyper-fast, chaotic erratic patterns, **Random Mutations** (scale size up/down rapidly, tilt angles). |
| **Default Audio** | `horror_ambient.mp3` (Eerie, tense atmospheric) | `phonk_drive.mp3` (Chill Phonk night drive beat) | `goofy_meme.mp3` (Comical, high-energy MLG music) |

---

### AUDIO OVERRIDE FEATURE
In the menu, provide a text input field where players can paste a YouTube Playlist URL or individual link. If a link is present, bypass the default MP3 playlists and handle loading the YouTube background audio via the YouTube IFrame Player API (hidden or integrated cleanly into the UI).

---

### STATS & LOCAL STORAGE
Maintain browser persistent storage (`localStorage`) tracking:
* Total minutes played across all sessions.
* Total number of times a game was started.
* Leaderboard: Top 3 highest scores achieved, saved with a formatted timestamp.

---

### UI/UX & CREDITS
* **Main Menu:** A sleek, modern dashboard overlay with gamemode selection tiles, the custom image drop-zone, the YouTube link input, and a "View Stats" modal.
* **Credits:** At the bottom right of the main menu, prominently display: **"Made by Claymunza"**.
* **In-Game GUI:** Highly polished, minimalist HUD showing the Score (top center) and a sleek Health Bar (bottom center) that changes color theme based on the active game mode.

---

### CODE REQUIREMENTS
1. Provide the complete code structure. Optimize the 3D rendering loop to maintain 60FPS on mid-range devices.
2. Use placeholder URLs for default audio tracks and default nextbot images (`https://via.placeholder.com/...`).
3. Ensure the code handles window resizing flawlessly.
4. Separate the logic cleanly: Environment Setup, Game Loop/Physics, Entity AI, UI Management, and Event Listeners.

```

When v0 paused, this was used:
```
Continue generating exactly where you left off, keeping the high fidelity.
```

Further prompts for fixing issues or improving the game:
```
audio files placed and named correctly as they can be accessed from public URL. But not played within the game during live game session. Tried with custom audio track via YouTube video link, still no sound heard. Entities not spawning endlessly. If player moves away too far away, e.g. 100 blocks, previous entities can despawn and be deleted. Currently if player runs away too far then no new nextbot entities appear. Also, map generation produces only one side of wall and not rooms. Supposed to be like backrooms structure. Also make sure player does not spawn inside a wall by mistake. When player dies (game over) automatically release mouse cursor. Everything else intact!
```
```
Let the main menu screen layout be changed. Top-left corner has stats lucide-react icon and text "Stats". Bottom-left corner has the YouTube track or playlist entry box in a much smaller size. Top-right has lucide-react icon for leaderboard and text "Leaderboard". There would be a leaderboard connected to a NEONDB that is optional. If NeonDB not connected or detected, show simple placeholder "Leaderboard rankings unavailable right now". If NeonDB connected, then there would be 2 tabs "Global" and "Country". Detect the player's IP address and location and apply an emoji for representing the country. Show numbered ranks for upto 100 top among Global and by country. and below that, show the player's own entry with current rank number upto 999 and then show "999+". This new mechanism will work by asking the player to submit their score and enter a name (which gets appended with a random 4-digit number after a "#" sign, like a discriminator) after every game over. Name + discriminator gets stored in persistent browser storage. If browser storage has name detected, then no need to ask player for name when game over. Only show "Submit score" button. And if successfully sent to the NeonDB (no log in required, just a simple database with a table of submitted usernames, scores, countries, and timestamps (even though timestamp info won't be shown in leaderboard). Also the main menu should show a looping 3D FPV exploration through a randomly generated map in the background with ThreeJS already running. The title "MemeRooms" would be shown centered horizontally and vertically. Below it would be a version text "v2026.06.03.1". Below it would be a customize lucide-react icon and "Customize" text button. This would open up a modal that allows the drag and drop nextbot thing 60% left side of the modal. Also there should be a new panel to the right side 40% with customizations for entities attributes like speed, detection range, etc. Mobile view controls right side screen region for moving camera vision not working. Lastly, the map generation algorithm needs to be updated for more realistic and diverse backrooms structures. Everything else intact!
```