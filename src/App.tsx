import React, { useState, useEffect, useRef } from 'react';

import React, { useState, useEffect, useRef } from 'react';

// Types for our game entities
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color?: string;
  vx?: number;
  vy?: number;
  life?: number;
  rotation?: number;
  rotationSpeed?: number;
  points?: number;
  gold?: boolean;
  health?: number;
  lastShot?: number;
  shootRate?: number;
  miniBoss?: boolean;
  type?: 'shield' | 'upgrade' | 'wreckage' | 'knowledge' | 'life' | 'mine' | 'coin';
  playerIndex?: number; // 0 for P1
  value?: number; // For coins
}

interface Inventory {
  startLevel2: boolean;
  maxHealth: boolean;
  magnet: boolean;
}

interface GameState {
  ships: (GameObject & { 
    active: boolean;
    shield: boolean; 
    weaponLevel: number; // Max 3
    invulnerable: number; 
  })[];
  bullets: GameObject[];
  asteroids: GameObject[];
  enemyShips: GameObject[];
  enemyBullets: GameObject[];
  mines: GameObject[];
  powerups: GameObject[]; // Includes coins
  particles: GameObject[];
  keys: { [key: string]: boolean };
  lastAsteroidTime: number;
  lastEnemyTime: number;
  lastPowerupTime: number;
  lastMiniBossTime: number;
  lastMineTime: number;
  bossWarningActive: boolean;
  comboValue: number;
  comboTimer: number | null;
  fireCooldowns: number[];
  screenShake: number;
  achievementQueue: string[];
  timeDilation: number; 
  timeDilationTimer: number | null;
  warpEnergy: number; // 0 to 100
}

const DEFEAT_TITLES = [
  "SIGNAL LOST", "HULL BREACHED", "MISSION FAILED", "KIA", "SYSTEM FAILURE", "OVERWHELMED"
];

const SPACE_FACTS = [
    "One million Earths could fit inside the Sun.",
    "A neutron star is so dense that a teaspoon of it weighs 6 billion tons.",
    "Space is completely silent because sound cannot travel through a vacuum.",
    "Venus spins backwards. The sun rises in the west there.",
    "Footprints on the Moon will last for 100 million years.",
    "Light from the Sun takes 8 minutes to reach Earth.",
    "Mars has a volcano three times the height of Mount Everest.",
    "There are more stars in the universe than grains of sand on Earth.",
    "A day on Venus is longer than a year on Venus.",
    "If two pieces of the same metal touch in space, they fuse permanently.",
    "Jupiter's Great Red Spot is a storm that has raged for 400 years.",
    "Saturn is less dense than water. It would float in a giant bathtub.",
    "Black holes are packed matter, not empty holes.",
    "The sunset on Mars appears blue.",
    "The hottest planet is Venus, not Mercury, due to its atmosphere.",
    "We are all made of stardust from exploding stars."
];

const PLANETS = [
    { name: "EARTH", img: "https://upload.wikimedia.org/wikipedia/commons/2/22/Earth_Western_Hemisphere_transparent_background.png" },
    { name: "THE MOON", img: "https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg" },
    { name: "MARS", img: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg" },
    { name: "JUPITER", img: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg" },
    { name: "SATURN", img: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg" },
    { name: "URANUS", img: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg" },
    { name: "NEPTUNE", img: "https://upload.wikimedia.org/wikipedia/commons/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg" },
    { name: "PLUTO", img: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Nh-pluto-in-true-color_2x_JPEG.jpg" },
    { name: "KEPLER-452B", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Kepler-452b_artist_concept.jpg/1200px-Kepler-452b_artist_concept.jpg" },
    { name: "GALACTIC CORE", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Milky_Way_Galaxy_Center_Chandra.jpg/1200px-Milky_Way_Galaxy_Center_Chandra.jpg" },
    { name: "ANDROMEDA", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Andromeda_Galaxy_560mm_FL.jpg/1280px-Andromeda_Galaxy_560mm_FL.jpg" },
    { name: "BLACK HOLE", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Black_hole_-_Messier_87_crop_max_res.jpg/1200px-Black_hole_-_Messier_87_crop_max_res.jpg" },
    { name: "THE VOID", img: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Loading_icon.gif" },
];

// Rebalanced leveling - Slower progression
const LEVEL_THRESHOLDS = [0, 1000, 2500, 4500, 7000, 10000, 15000, 20000, 30000, 45000, 60000];

const SHOP_ITEMS = [
    { id: 'startLevel2', name: 'PLASMA TWIN', desc: 'Start with Dual Cannons', cost: 500, icon: '🚀' },
    { id: 'maxHealth', name: 'TITAN HULL', desc: 'Start with 5 Lives', cost: 800, icon: '❤️' },
    { id: 'magnet', name: 'GRAVITY WELL', desc: 'Coins attract to you', cost: 1200, icon: '🧲' }
];

export default function SpaceDefender() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);

  const [gameState, setGameState] = useState<'menu' | 'shop' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [currency, setCurrency] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [inventory, setInventory] = useState<Inventory>({ startLevel2: false, maxHealth: false, magnet: false });
  
  const [darkMode, setDarkMode] = useState(false); 
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [activeFact, setActiveFact] = useState<string | null>(null);
  const [dangerAlert, setDangerAlert] = useState(false);
  const [planetNotification, setPlanetNotification] = useState<string | null>(null);
  const [warpEnergy, setWarpEnergy] = useState(100);
  const [totalKills, setTotalKills] = useState(0);
  
  const [lastDeath, setLastDeath] = useState<{x: number, y: number, killer: string, color: string} | null>(null);
  
  const [gameOverStats, setGameOverStats] = useState({
    title: "GAME OVER",
    spaceFact: "",
    nextLevelProgress: 0,
    killerType: '',
    killerColor: '#fff'
  });

  const gameRef = useRef<GameState>({
    ships: [],
    bullets: [], asteroids: [], enemyShips: [], enemyBullets: [], mines: [],
    powerups: [], particles: [], keys: {}, 
    lastAsteroidTime: 0, lastEnemyTime: 0, lastPowerupTime: 0, lastMiniBossTime: 0, lastMineTime: 0,
    bossWarningActive: false,
    comboValue: 0, comboTimer: null, fireCooldowns: [0, 0], screenShake: 0, achievementQueue: [],
    timeDilation: 1.0, timeDilationTimer: null, warpEnergy: 100
  });

  // Load persistence
  useEffect(() => { 
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)); 
    const savedHi = localStorage.getItem('space_high_score');
    if (savedHi) setHighScore(parseInt(savedHi));
    const savedCoins = localStorage.getItem('space_coins');
    if (savedCoins) setCurrency(parseInt(savedCoins));
    const savedInv = localStorage.getItem('space_inventory');
    if (savedInv) setInventory(JSON.parse(savedInv));
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem('space_high_score', highScore.toString());
    localStorage.setItem('space_coins', currency.toString());
    localStorage.setItem('space_inventory', JSON.stringify(inventory));
  }, [highScore, currency, inventory]);

  const speakFact = (text: string) => {
      if (muted) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
  };

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (bgMusicRef.current && !muted) {
      bgMusicRef.current.volume = 0.4;
      bgMusicRef.current.currentTime = 0;
      bgMusicRef.current.play().catch(e => console.log("Audio play failed", e));
    }
  };

  const playSound = (type: 'shoot' | 'explode' | 'powerup' | 'hit' | 'gameover' | 'vengeance' | 'intel' | 'warning' | 'life' | 'mine' | 'coin' | 'warp') => {
    if (muted || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    switch (type) {
      case 'shoot':
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now); osc.stop(now + 0.03); break;
      case 'explode':
        osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
        gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3); break;
      case 'coin':
        osc.type = 'sine'; osc.frequency.setValueAtTime(1500, now); osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.1); break;
      case 'warp':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5); break;
      case 'mine':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.8);
        gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now); osc.stop(now + 0.8); break;
      case 'powerup':
        osc.type = 'sine'; osc.frequency.setValueAtTime(1000, now); osc.frequency.linearRampToValueAtTime(2000, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now); osc.stop(now + 0.3); break;
      case 'vengeance':
        osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(800, now + 0.4);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4); break;
      case 'hit':
        osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05); break;
      case 'gameover':
        osc.type = 'triangle'; osc.frequency.setValueAtTime(500, now); osc.frequency.linearRampToValueAtTime(50, now + 1);
        gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(now); osc.stop(now + 1); break;
      case 'intel':
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.linearRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.8);
        osc.start(now); osc.stop(now + 0.8); break;
      case 'warning':
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(200, now + 0.5);
        gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5); break;
      case 'life':
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4); break;
    }
  };

  useEffect(() => {
    let newLevel = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (score >= LEVEL_THRESHOLDS[i]) newLevel = i + 1;
    }
    if (newLevel !== level) {
        setLevel(newLevel);
        const planetIndex = Math.min(newLevel - 1, PLANETS.length - 1);
        const planetName = PLANETS[planetIndex].name;
        if (newLevel > 1) {
            setPlanetNotification(`WARPING TO ${planetName}...`);
            setAchievements([`LEVEL ${newLevel} REACHED!`]);
            setTimeout(() => {
                setAchievements([]);
                setPlanetNotification(null);
            }, 3000);
        }
    }
  }, [score, level]);

  const startGame = () => {
    initAudio();
    setGameState('playing'); 
    setScore(0); 
    setLives(inventory.maxHealth ? 5 : 3); 
    setLevel(1);
    setCombo(0);
    setTotalKills(0);
    setAchievements([]);
    setActiveFact(null);
    setDangerAlert(false);
    setPlanetNotification(null);
    
    const g = gameRef.current;
    g.bullets = []; g.asteroids = []; g.enemyShips = []; g.enemyBullets = []; g.powerups = []; g.particles = []; g.mines = [];
    g.keys = {}; g.comboValue = 0; g.comboTimer = null; g.fireCooldowns = [0, 0]; g.screenShake = 0; g.achievementQueue = [];
    g.warpEnergy = 100;
    
    // Initialize Ships
    g.ships = [
      { 
        x: isMobile ? window.innerWidth / 2 - 20 : 375, 
        y: 500, width: 40, height: 40, speed: 9, 
        shield: false, 
        weaponLevel: inventory.startLevel2 ? 2 : 1, // Store Upgrade check
        invulnerable: 0, 
        color: '#22d3ee', active: true, playerIndex: 0 
      }
    ];

    g.timeDilation = 1.0;
    g.lastMiniBossTime = performance.now();
    g.bossWarningActive = false;

    if (lastDeath) {
        g.powerups.push({
            type: 'wreckage', x: lastDeath.x, y: -50, width: 40, height: 40, speed: 1.5, color: '#94a3b8'
        });
        setAchievements(["⚠️ BLACK BOX DETECTED"]);
        setTimeout(() => setAchievements([]), 4000);
    }
  };

  const buyItem = (item: typeof SHOP_ITEMS[0]) => {
      if (currency >= item.cost) {
          // @ts-ignore
          if (!inventory[item.id]) {
              setCurrency(c => c - item.cost);
              setInventory(prev => ({ ...prev, [item.id]: true }));
              playSound('powerup');
          }
      } else {
          playSound('hit');
      }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    const resizeCanvas = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      let canvasW, canvasH;

      if (isMobile) {
        canvasW = w;
        canvasH = h;
      } else {
        canvasH = h - 40; 
        canvasW = canvasH * (3/4); 
        if (canvasW > w - 20) { canvasW = w - 20; canvasH = canvasW * (4/3); }
      }
      canvas.width = canvasW; 
      canvas.height = canvasH;
      
      const shipSize = canvasW < 500 ? 32 : 44;
      g.ships.forEach(ship => {
        ship.width = shipSize; 
        ship.height = shipSize;
        ship.y = Math.min(ship.y, canvasH - shipSize * 2); 
        ship.x = Math.min(ship.x, canvasW - ship.width);
      });
    };
    resizeCanvas(); 
    window.addEventListener('resize', resizeCanvas);

    const shootBullet = (shipIndex: number) => {
      const ship = g.ships[shipIndex];
      if (!ship || !ship.active) return;

      const now = performance.now();
      if (now < g.fireCooldowns[shipIndex]) return;
      
      const cooldown = 90 - (ship.weaponLevel * 10);
      g.fireCooldowns[shipIndex] = now + Math.max(40, cooldown);
      
      playSound('shoot');
      g.particles.push({ x: ship.x + ship.width / 2, y: ship.y + ship.height, vx: 0, vy: 2, life: 5, color: ship.color, width: 4, height: 4, speed: 0 });
      
      const bSpeed = canvas.height / 45; 
      const bWidth = 3; const bHeight = 16;
      const midX = ship.x + ship.width / 2;
      const noseY = ship.y;
      
      if (ship.weaponLevel === 1) {
          g.bullets.push({ x: midX - bWidth/2, y: noseY, width: bWidth, height: bHeight, speed: bSpeed, vx: 0, color: ship.color });
      } 
      else if (ship.weaponLevel === 2) {
          g.bullets.push({ x: midX - 8, y: noseY + 4, width: bWidth, height: bHeight, speed: bSpeed, vx: 0, color: ship.color });
          g.bullets.push({ x: midX + 8, y: noseY + 4, width: bWidth, height: bHeight, speed: bSpeed, vx: 0, color: ship.color });
      }
      else {
          g.bullets.push({ x: midX - bWidth/2, y: noseY, width: bWidth, height: bHeight, speed: bSpeed, vx: 0, color: ship.color });
          g.bullets.push({ x: midX - 12, y: noseY + 6, width: bWidth, height: bHeight, speed: bSpeed * 0.95, vx: -1, color: ship.color });
          g.bullets.push({ x: midX + 12, y: noseY + 6, width: bWidth, height: bHeight, speed: bSpeed * 0.95, vx: 1, color: ship.color });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => { 
      g.keys[e.key] = true; 
      if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); shootBullet(0); }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => { g.keys[e.key] = false; };
    const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); shootBullet(0); };
    const handleTouchMove = (e: TouchEvent) => { 
      if (!isMobile) return; 
      if (e.cancelable) e.preventDefault(); 
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect(); 
      const scaleX = canvas.width / rect.width; 
      const scaleY = canvas.height / rect.height;
      if (g.ships[0]) {
        g.ships[0].x = Math.max(0, Math.min((t.clientX - rect.left) * scaleX - g.ships[0].width / 2, canvas.width - g.ships[0].width));
        g.ships[0].y = Math.max(0, Math.min((t.clientY - rect.top) * scaleY - g.ships[0].height / 2, canvas.height - g.ships[0].height));
      }
    };

    if (!isMobile) canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchmove', handleTouchMove, {passive: false});
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const createExplosion = (x: number, y: number, color: string, scale = 1) => {
      playSound('explode');
      const count = 10 * scale;
      for (let i = 0; i < count; i++) { 
        const angle = (Math.random() * Math.PI * 2); 
        const speed = Math.random() * 5 * scale;
        g.particles.push({ x, y, width: 0, height: 0, speed: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 25 + Math.random() * 15, color }); 
      }
    };

    const spawnCoin = (x: number, y: number) => {
        // Chance to spawn coin
        if (Math.random() < 0.15) {
            g.powerups.push({ x, y, width: 25, height: 25, speed: 2, type: 'coin', value: 1, color: '#FFD700' });
        }
    };

    const spawnPowerup = (x: number, y: number) => {
      if (Math.random() > 0.10) return; 
      const r = Math.random();
      let type: 'shield' | 'upgrade' | 'knowledge' | 'life' = 'shield';
      let color = '#3b82f6'; 
      if (r < 0.04) { type = 'life'; color = '#ef4444'; }
      else if (r < 0.15) { type = 'knowledge'; color = '#c084fc'; }
      else if (r < 0.50) { type = 'upgrade'; color = '#facc15'; } 
      else { type = 'shield'; color = '#3b82f6'; }
      g.powerups.push({ x, y, width: 30, height: 30, speed: 3, type, color });
    };

    const showAchievement = (text: string) => {
      if (!g.achievementQueue.includes(text)) {
        g.achievementQueue.push(text);
        setAchievements([text]);
        setTimeout(() => {
          setAchievements([]);
          g.achievementQueue = g.achievementQueue.filter(a => a !== text);
        }, 3000);
      }
    };

    let animationId: number;

    const gameLoop = (ts: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Starfield
      const starOpacity = darkMode ? 0.6 : 0.3;
      ctx.fillStyle = '#ffffff'; 
      for (let i = 0; i < 60; i++) { 
        const speed = (i % 3) + 1;
        const x = (i * 73) % canvas.width;
        const y = (i * 97 + ts * 0.05 * speed) % canvas.height;
        ctx.globalAlpha = starOpacity;
        ctx.fillRect(x, y, speed, speed); 
      }
      ctx.globalAlpha = 1.0;

      // TIME WARP LOGIC
      const isTimeWarping = (g.keys['Shift'] || g.keys['Control']) && g.warpEnergy > 0;
      if (isTimeWarping) {
          g.timeDilation = 0.2; // Slow everything down
          g.warpEnergy = Math.max(0, g.warpEnergy - 0.5); // Drain energy
          if (Math.random() < 0.2) playSound('warp');
      } else if (!g.timeDilationTimer) {
          g.timeDilation = 1.0;
          g.warpEnergy = Math.min(100, g.warpEnergy + 0.1); // Regen
      }
      setWarpEnergy(g.warpEnergy);

      if (g.screenShake > 0) { 
        ctx.save(); 
        const shake = g.screenShake * (Math.random() > 0.5 ? 1 : -1);
        ctx.translate(shake, shake); 
        g.screenShake *= 0.9; 
        if (g.screenShake < 0.5) g.screenShake = 0;
      }

      // Handle Inputs
      const p1 = g.ships[0];
      if (p1 && p1.active) {
          // Combined movement for Single Player
          const up = g.keys['ArrowUp'] || g.keys['w'] || g.keys['W'];
          const down = g.keys['ArrowDown'] || g.keys['s'] || g.keys['S'];
          const left = g.keys['ArrowLeft'] || g.keys['a'] || g.keys['A'];
          const right = g.keys['ArrowRight'] || g.keys['d'] || g.keys['D'];
          // Player moves at FULL SPEED even in time warp
          if (left && p1.x > 0) p1.x -= p1.speed;
          if (right && p1.x < canvas.width - p1.width) p1.x += p1.speed;
          if (up && p1.y > 0) p1.y -= p1.speed;
          if (down && p1.y < canvas.height - p1.height) p1.y += p1.speed;
      }
      
      // Draw Ships
      g.ships.forEach(ship => {
          if (!ship.active) return;
          const shipInvuln = ship.invulnerable > ts;
          if (!shipInvuln || Math.floor(ts / 100) % 2 === 0) {
            ctx.save(); 
            const shieldColor = ship.shield ? '#3b82f6' : ship.color;
            ctx.shadowBlur = ship.shield ? 30 : isTimeWarping ? 30 : 15; 
            ctx.shadowColor = isTimeWarping ? '#00ffff' : shieldColor || '#fff'; 
            ctx.fillStyle = shieldColor || '#fff';
            
            ctx.beginPath(); ctx.moveTo(ship.x + ship.width / 2, ship.y); 
            ctx.lineTo(ship.x, ship.y + ship.height); ctx.lineTo(ship.x + ship.width / 2, ship.y + ship.height - 10); 
            ctx.lineTo(ship.x + ship.width, ship.y + ship.height); ctx.closePath(); ctx.fill(); 
            
            ctx.fillStyle = isTimeWarping ? '#00ffff' : '#f59e0b';
            ctx.beginPath(); ctx.moveTo(ship.x + ship.width / 2 - 5, ship.y + ship.height - 5);
            ctx.lineTo(ship.x + ship.width / 2, ship.y + ship.height + 10 + Math.random() * 10);
            ctx.lineTo(ship.x + ship.width / 2 + 5, ship.y + ship.height - 5); ctx.fill();
            
            if (ship.shield) {
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.beginPath();
                ctx.arc(ship.x + ship.width/2, ship.y + ship.height/2, ship.width, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
          }
      });

      if (g.timeDilationTimer && ts > g.timeDilationTimer) {
          g.timeDilation = 1.0;
          g.timeDilationTimer = null;
          setActiveFact(null);
      }

      // Draw Powerups & Coins
      g.powerups.forEach((p, pi) => {
        // GRAVITY WELL (Magnet)
        if (inventory.magnet && p.type === 'coin') {
             const ship = g.ships[0];
             if (ship && ship.active) {
                 const dx = (ship.x + ship.width/2) - (p.x + p.width/2);
                 const dy = (ship.y + ship.height/2) - (p.y + p.height/2);
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist < 300) {
                     p.x += (dx / dist) * 5;
                     p.y += (dy / dist) * 5;
                 } else {
                     p.y += p.speed;
                 }
             } else {
                 p.y += p.speed;
             }
        } else {
            p.y += p.speed; 
        }

        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = p.color || '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '24px Arial';

        if (p.type === 'coin') {
            // Spinning Coin
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); 
            const scale = Math.abs(Math.sin(ts * 0.005));
            ctx.ellipse(p.x + p.width/2, p.y + p.height/2, p.width/2 * scale, p.height/2, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = '16px Arial'; ctx.fillText('$', p.x + p.width/2, p.y + p.height/2);
        } else if (p.type === 'wreckage') {
             ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); 
             ctx.beginPath(); ctx.rect(p.x, p.y, p.width, p.height); ctx.stroke();
             ctx.fillText("💀", p.x + p.width/2, p.y + p.height/2);
        } else {
             let icon = '';
             switch(p.type) {
                 case 'shield': icon = '🛡️'; break;
                 case 'upgrade': icon = '⚡'; break;
                 case 'knowledge': icon = '🧠'; break;
                 case 'life': icon = '❤️'; break;
                 default: icon = '❓';
             }
             ctx.fillText(icon, p.x + p.width/2, p.y + p.height/2);
             const angle = ts * 0.005; ctx.fillStyle = p.color || '#fff'; ctx.beginPath();
             ctx.arc(p.x + p.width/2 + Math.cos(angle) * 20, p.y + p.height/2 + Math.sin(angle) * 20, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

        g.ships.forEach(ship => {
            if (!ship.active) return;
            if (p.x < ship.x + ship.width && p.x + p.width > ship.x && p.y < ship.y + ship.height && p.y + p.height > ship.y) {
                if (g.powerups.includes(p)) {
                    g.powerups.splice(pi, 1);
                    if (p.type === 'coin') {
                        playSound('coin');
                        setCurrency(c => c + (p.value || 1));
                    } else if (p.type === 'wreckage') {
                        playSound('vengeance'); showAchievement("⚔️ VENGEANCE RECLAIMED!"); 
                        setScore(s => s + 500);
                        ship.weaponLevel = 3; ship.shield = true;
                        setTimeout(() => { ship.shield = false; }, 5000);
                    } else if (p.type === 'knowledge') {
                        playSound('intel');
                        const fact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];
                        setActiveFact(fact); speakFact(fact);
                        showAchievement("🧠 MATRIX MODE");
                        g.timeDilation = 0.2; g.timeDilationTimer = ts + 5000;
                        setScore(s => s + 50);
                    } else if (p.type === 'life') {
                        playSound('life'); showAchievement("❤️ HULL REPAIRED");
                        setLives(l => Math.min(l + 1, 5));
                    } else if (p.type === 'upgrade') {
                        playSound('powerup');
                        if (ship.weaponLevel < 3) {
                            ship.weaponLevel++;
                            showAchievement(`WEAPON LEVEL ${ship.weaponLevel}!`);
                        } else {
                            showAchievement("MAX POWER!"); setScore(s => s + 100);
                        }
                    } else {
                        playSound('powerup'); showAchievement(`SHIELD ACTIVATED!`);
                        ship.shield = true; setTimeout(() => ship.shield = false, 10000);
                    }
                }
            }
        });
      });
      g.powerups = g.powerups.filter(p => p.y < canvas.height);

      // Mines
      if (level >= 5 && ts - g.lastMineTime > Math.max(5000, 15000 - level * 500)) {
          g.lastMineTime = ts;
          g.mines.push({
              x: Math.random() * (canvas.width - 40), y: -40, width: 40, height: 40, speed: 1.5 * g.timeDilation, type: 'mine'
          });
      }
      g.mines.forEach((mine, mi) => {
          mine.y += mine.speed;
          ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = '#f00'; ctx.fillStyle = '#333';
          ctx.beginPath(); ctx.arc(mine.x + mine.width/2, mine.y + mine.height/2, 15, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f00';
          for(let i=0; i<8; i++) {
              const ang = (i / 8) * Math.PI * 2 + ts * 0.002;
              ctx.beginPath(); ctx.moveTo(mine.x + 20 + Math.cos(ang)*10, mine.y + 20 + Math.sin(ang)*10);
              ctx.lineTo(mine.x + 20 + Math.cos(ang)*22, mine.y + 20 + Math.sin(ang)*22); ctx.stroke();
          }
          if (Math.floor(ts / 200) % 2 === 0) { ctx.fillStyle = '#f00'; ctx.beginPath(); ctx.arc(mine.x+20, mine.y+20, 5, 0, Math.PI*2); ctx.fill(); }
          ctx.restore();

          g.ships.forEach(ship => {
              if (ship.active && !ship.shield && !(ship.invulnerable > ts)) {
                  if (mine.x < ship.x + ship.width && mine.x + mine.width > ship.x && mine.y < ship.y + ship.height && mine.y + mine.height > ship.y) {
                      g.mines.splice(mi, 1); playSound('explode'); createExplosion(ship.x, ship.y, '#f00', 3);
                      setLives(l => l - 1); g.screenShake = 30; ship.invulnerable = ts + 2000; ship.weaponLevel = 1;
                      if (lives === 1) setLastDeath({x: ship.x, y: ship.y, killer: 'SPACE MINE', color: '#f00'});
                  }
              }
          });
      });
      g.mines = g.mines.filter(m => m.y < canvas.height);

      // Bullets
      g.bullets.forEach((b) => { 
        b.y -= b.speed; if (b.vx) b.x += b.vx;
        ctx.save(); const bulletColor = b.color || '#fbbf24'; ctx.shadowBlur = 10; ctx.shadowColor = bulletColor; ctx.fillStyle = bulletColor; 
        ctx.beginPath(); ctx.arc(b.x + b.width/2, b.y, b.width/2, Math.PI, 0); ctx.lineTo(b.x + b.width, b.y + b.height);
        ctx.arc(b.x + b.width/2, b.y + b.height, b.width/2, 0, Math.PI); ctx.lineTo(b.x, b.y); ctx.fill(); ctx.restore(); 
      });
      g.bullets = g.bullets.filter(b => b.y > 0 && b.x > 0 && b.x < canvas.width);

      // Spawning
      if (ts - g.lastAsteroidTime > Math.max(200, 800 - level * 60)) { 
        g.lastAsteroidTime = ts; 
        const size = 20 + Math.random() * 50;
        const speed = (2.5 + level * 0.5 + Math.random() * (3 + level * 0.4)) * g.timeDilation;
        const isGolden = Math.random() < 0.05;
        
        // Chaotic Asteroids (Level 3+)
        let startX = Math.random() * (canvas.width - size);
        let startY = -size;
        let vx = 0;
        let vy = speed;
        
        // Chaotic trajectories
        if (level >= 3) {
            vx = (Math.random() - 0.5) * (level * 0.5); 
        }

        // Side Spawns (Level 6+)
        if (level >= 6 && Math.random() < 0.3) {
             if (Math.random() < 0.5) {
                startX = -size;
                vx = Math.abs(vx) + 1 + level * 0.2; // Move Right
            } else {
                startX = canvas.width;
                vx = -(Math.abs(vx) + 1 + level * 0.2); // Move Left
            }
            startY = Math.random() * (canvas.height / 2); 
            vy = speed * 0.5;
        }

        g.asteroids.push({
          x: startX, y: startY, width: size, height: size, speed,
          vx: vx, vy: vy,
          rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.1,
          points: isGolden ? 100 : size > 50 ? 25 : size > 35 ? 15 : 10,
          color: isGolden ? '#FFD700' : size > 50 ? '#fbbf24' : size > 35 ? '#f97316' : '#ef4444', gold: isGolden
        });
      }

      const enemySpawnRate = Math.max(1000, 3000 - level * 200);
      if (level >= 3 && ts - g.lastEnemyTime > enemySpawnRate) {
        g.lastEnemyTime = ts;
        g.enemyShips.push({
          x: Math.random() * (canvas.width - 40), y: -40, width: 40, height: 30, speed: (2 + Math.random() * (1 + level * 0.2)) * g.timeDilation, 
          health: level >= 7 ? 4 : 2, lastShot: ts, shootRate: Math.max(400, 1500 - level * 100) 
        });
      }

      // DELAY BOSS to Level 5 and Slower
      const bossInterval = 60000; // 60 seconds
      const timeSinceBoss = ts - g.lastMiniBossTime;
      // Strictly check level 5
      if (level >= 5 && timeSinceBoss > (bossInterval - 3000) && timeSinceBoss < bossInterval && !g.bossWarningActive) {
          g.bossWarningActive = true;
          setDangerAlert(true);
          playSound('warning');
          setTimeout(() => setDangerAlert(false), 3000);
      }
      if (level >= 5 && timeSinceBoss > bossInterval) {
        g.lastMiniBossTime = ts;
        g.bossWarningActive = false;
        g.enemyShips.push({
          x: canvas.width / 2 - 40, y: -80, width: 80, height: 60, speed: 1.2 * g.timeDilation, 
          health: 20 + level * 2, lastShot: ts, shootRate: 400, miniBoss: true
        });
        showAchievement('⚠️ BOSS INCOMING!');
      }

      // Collisions (Asteroid)
      g.asteroids.forEach((a, ai) => {
        // Updated Movement with Time Dilation
        const currentVx = (a.vx || 0) * g.timeDilation;
        const currentVy = (a.vy || a.speed) * g.timeDilation;
        a.x += currentVx;
        a.y += currentVy;
        a.rotation = (a.rotation || 0) + (a.rotationSpeed || 0) * g.timeDilation;
        
        // Wall Bouncing (Side Bar Collision) - Unlock at Level 2
        if (level >= 2) {
            if (a.x <= 0) {
                a.x = 0;
                if (a.vx) a.vx = -a.vx;
            } else if (a.x + a.width >= canvas.width) {
                a.x = canvas.width - a.width;
                if (a.vx) a.vx = -a.vx;
            }
        }

        ctx.save(); ctx.translate(a.x + a.width / 2, a.y + a.height / 2); ctx.rotate(a.rotation); 
        ctx.shadowBlur = a.gold ? 20 : 10; ctx.shadowColor = a.color || '#fff'; ctx.fillStyle = a.color || '#fff';
        ctx.beginPath(); 
        for (let i = 0; i < 8; i++) { 
          const angle = (i / 8) * Math.PI * 2; const r = a.width / 2 * (0.8 + Math.sin(ts * 0.003 + i) * 0.2);
          const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; 
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); 
        } 
        ctx.closePath(); ctx.fill(); ctx.restore();
        
        g.ships.forEach(ship => {
            if (ship.active && a.x < ship.x + ship.width && a.x + a.width > ship.x && a.y < ship.y + ship.height && a.y + a.height > ship.y) {
                if (!ship.shield && !(ship.invulnerable > ts)) {
                    if (lives === 1) setLastDeath({ x: ship.x, y: ship.y, killer: 'ASTEROID', color: a.color || '#fff' });
                    playSound('hit'); setLives(l => l - 1); g.screenShake = 20; 
                    ship.invulnerable = ts + 2000; ship.weaponLevel = 1;
                    g.comboValue = 0; setCombo(0);
                } else if (ship.shield) {
                    ship.shield = false; ship.invulnerable = ts + 1000; playSound('hit');
                }
                if (g.asteroids.includes(a)) {
                     createExplosion(a.x + a.width/2, a.y + a.height/2, a.color || '#fff'); g.asteroids.splice(ai, 1);
                }
            }
        });
      });
      g.asteroids = g.asteroids.filter(a => a.y < canvas.height);

      // Enemies
      g.enemyShips.forEach((enemy, ei) => {
        enemy.y += enemy.speed * g.timeDilation;
        
        // Sine Wave Movement (Zig Zag) at Level 4+
        if (level >= 4 && !enemy.miniBoss) {
            enemy.x += Math.sin(ts * 0.005 + ei) * 2 * g.timeDilation;
        }

        if (enemy.lastShot && enemy.shootRate && ts - enemy.lastShot > enemy.shootRate / g.timeDilation) {
          enemy.lastShot = ts;
          const bSpeed = (6 + level * 0.4) * g.timeDilation;
          if (level >= 8 && !enemy.miniBoss) {
              g.enemyBullets.push({ x: enemy.x + 5, y: enemy.y + enemy.height, width: 4, height: 12, speed: bSpeed });
              g.enemyBullets.push({ x: enemy.x + enemy.width - 9, y: enemy.y + enemy.height, width: 4, height: 12, speed: bSpeed });
          } else {
              g.enemyBullets.push({ x: enemy.x + enemy.width / 2 - 2, y: enemy.y + enemy.height, width: 4, height: 12, speed: bSpeed });
          }
        }
        ctx.save(); ctx.shadowBlur = enemy.miniBoss ? 20 : 12; ctx.shadowColor = '#dc2626'; ctx.fillStyle = enemy.miniBoss ? '#991b1b' : '#dc2626';
        ctx.beginPath();
        if (enemy.miniBoss) {
          ctx.rect(enemy.x, enemy.y, enemy.width, enemy.height); ctx.fillStyle = '#ef4444'; ctx.fillRect(enemy.x + 10, enemy.y + 10, enemy.width - 20, enemy.height - 20);
        } else {
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height); ctx.lineTo(enemy.x, enemy.y); ctx.lineTo(enemy.x + enemy.width, enemy.y);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();

        g.ships.forEach(ship => {
            if (ship.active && enemy.y + enemy.height > ship.y && enemy.x < ship.x + ship.width && enemy.x + enemy.width > ship.x) {
                if (!ship.shield && !(ship.invulnerable > ts)) {
                    if (lives === 1) setLastDeath({ x: ship.x, y: ship.y, killer: enemy.miniBoss ? 'BOSS' : 'INVADER', color: '#dc2626' });
                    playSound('hit'); setLives(l => l - 1); g.screenShake = 20; 
                    ship.invulnerable = ts + 2000; ship.weaponLevel = 1;
                    g.comboValue = 0; setCombo(0);
                } else if (ship.shield) {
                    ship.shield = false; ship.invulnerable = ts + 1000; playSound('hit');
                }
                if (g.enemyShips.includes(enemy)) {
                     createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#dc2626', 2); g.enemyShips.splice(ei, 1);
                }
            }
        });
      });
      g.enemyShips = g.enemyShips.filter(e => e.y < canvas.height && (e.health || 0) > 0);

      g.enemyBullets.forEach((bullet) => {
        bullet.y += bullet.speed * g.timeDilation; ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#ec4899'; ctx.fillStyle = '#ec4899';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height); ctx.restore();
        g.ships.forEach(ship => {
             if (ship.active && bullet.y + bullet.height > ship.y && bullet.x < ship.x + ship.width && bullet.x + bullet.width > ship.x && bullet.y < ship.y + ship.height) {
                 if (!ship.shield && !(ship.invulnerable > ts)) {
                    if (lives === 1) setLastDeath({ x: ship.x, y: ship.y, killer: 'PLASMA', color: '#ec4899' });
                    playSound('hit'); setLives(l => l - 1); g.screenShake = 15; 
                    ship.invulnerable = ts + 2000; ship.weaponLevel = 1;
                    g.comboValue = 0; setCombo(0);
                 } else if (ship.shield) {
                     ship.shield = false; ship.invulnerable = ts + 1000; playSound('hit');
                 }
                 g.enemyBullets = g.enemyBullets.filter(b => b !== bullet);
             }
        });
      });
      g.enemyBullets = g.enemyBullets.filter(b => b.y < canvas.height);

      g.bullets.forEach((b, bi) => {
        g.asteroids.forEach((a, ai) => {
          if (b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y) {
            g.bullets.splice(bi, 1); g.asteroids.splice(ai, 1);
            g.comboValue += 1; setCombo(g.comboValue); setScore(s => s + (a.points || 10) + g.comboValue); setTotalKills(t => t + 1);
            createExplosion(a.x + a.width/2, a.y + a.height/2, a.color || '#fff'); spawnCoin(a.x, a.y); spawnPowerup(a.x, a.y);
            g.screenShake = 5; if (a.gold) showAchievement('💰 Golden Slayer!');
            if (g.comboTimer) clearTimeout(g.comboTimer); g.comboTimer = setTimeout(() => { g.comboValue = 0; setCombo(0); }, 2000);
          }
        });

        g.enemyShips.forEach((enemy, ei) => {
          if (b.x < enemy.x + enemy.width && b.x + b.width > enemy.x && b.y < enemy.y + enemy.height && b.y + b.height > enemy.y) {
            g.bullets.splice(bi, 1);
            if (enemy.health) enemy.health--;
            if (enemy.health && enemy.health <= 0) {
              g.enemyShips.splice(ei, 1);
              const points = enemy.miniBoss ? 200 : 50;
              setScore(s => s + points + g.comboValue * 2); g.comboValue += 2; setCombo(g.comboValue); setTotalKills(t => t + 1);
              createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#dc2626', enemy.miniBoss ? 3 : 1);
              spawnCoin(enemy.x, enemy.y); spawnPowerup(enemy.x, enemy.y); g.screenShake = enemy.miniBoss ? 20 : 8;
              if (enemy.miniBoss) showAchievement('👑 BOSS DEFEATED!');
            } else {
                g.particles.push({ x: b.x, y: b.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 5, color: '#fff', width:2, height:2, speed:0 });
            }
          }
        });

        g.mines.forEach((mine, mi) => {
            if (b.x < mine.x + mine.width && b.x + b.width > mine.x && b.y < mine.y + mine.height && b.y + b.height > mine.y) {
                g.bullets.splice(bi, 1); g.mines.splice(mi, 1); playSound('mine');
                createExplosion(mine.x + 20, mine.y + 20, '#ffaa00', 4); g.screenShake = 40; showAchievement("💣 BOMB DETONATED!");
                g.enemyShips = g.enemyShips.filter(e => {
                    const dist = Math.hypot((e.x+e.width/2) - (mine.x+20), (e.y+e.height/2) - (mine.y+20));
                    if (dist < 300 && !e.miniBoss) { createExplosion(e.x, e.y, '#dc2626'); setScore(s => s + 50); return false; }
                    return true;
                });
                g.enemyBullets = g.enemyBullets.filter(eb => Math.hypot(eb.x - (mine.x+20), eb.y - (mine.y+20)) > 300);
            }
        });
      });

      g.particles.forEach((p, pi) => { 
        if (p.vx !== undefined && p.vy !== undefined && p.life !== undefined) {
          p.x += p.vx; p.y += p.vy; p.life--; 
          if (p.life <= 0) { g.particles.splice(pi, 1); } else {
            ctx.fillStyle = p.color || '#fff'; ctx.globalAlpha = p.life / 20; const size = Math.max(2, (p.life / 20) * 6);
            ctx.fillRect(p.x, p.y, size, size); ctx.globalAlpha = 1; 
          }
        }
      });

      if (g.screenShake > 0) ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(0, 0, canvas.width, 60);
      const fontSize = isMobile ? 16 : 20; ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      
      // HUD LEFT
      ctx.fillStyle = '#22d3ee'; ctx.textAlign = 'left'; ctx.fillText(`SCORE: ${score}`, 15, 25);
      ctx.fillStyle = '#facc15'; ctx.textAlign = 'left'; ctx.fillText(`$${currency}`, 15, 50);
      
      // HUD RIGHT
      ctx.fillStyle = '#c084fc'; ctx.textAlign = 'right'; ctx.fillText(`LVL ${level}`, canvas.width - 15, 25);
      
      // HUD CENTER - HEARTS
      ctx.textAlign = 'center'; const hearts = '❤️'.repeat(Math.min(lives, 5));
      ctx.font = `${fontSize}px serif`; ctx.fillText(hearts, canvas.width / 2, 25);
      
      // WARP ENERGY BAR
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(canvas.width - 150, 40, 100, 10);
      ctx.fillStyle = '#00ffff'; ctx.fillRect(canvas.width - 150, 40, warpEnergy, 10);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(canvas.width - 150, 40, 100, 10);
      ctx.font = '10px Arial'; ctx.fillStyle = '#fff'; ctx.fillText("TIME WARP", canvas.width - 100, 36);

      if (combo > 1) {
          ctx.textAlign = 'center'; ctx.font = `bold ${fontSize + 4}px Arial`;
          ctx.fillStyle = `hsl(${ts % 360}, 100%, 50%)`; ctx.fillText(`${combo}x COMBO!`, canvas.width / 2, 80);
      }
      ctx.restore();
      
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (!isMobile) canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
      if (g.comboTimer) clearTimeout(g.comboTimer);
      if (g.timeDilationTimer) clearTimeout(g.timeDilationTimer);
    };
  }, [gameState, isMobile, level, score, lives, combo, highScore, darkMode, inventory, currency, warpEnergy]);

  useEffect(() => {
    if (lives <= 0 && gameState === 'playing') {
      const newHigh = Math.max(score, highScore);
      setHighScore(newHigh);
      setGameState('gameover');
      setCombo(0);
      playSound('gameover');
      setActiveFact(null);
      setDangerAlert(false);
      setPlanetNotification(null);
      if (bgMusicRef.current) bgMusicRef.current.pause();

      const title = DEFEAT_TITLES[Math.floor(Math.random() * DEFEAT_TITLES.length)];
      const fact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];
      
      let nextScore = 100;
      for(let t of LEVEL_THRESHOLDS) { if (score < t) { nextScore = t; break; } }
      if (score >= 60000) nextScore = Math.ceil((score + 1) / 5000) * 5000;
      let prevScore = 0;
       for(let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) { if (score >= LEVEL_THRESHOLDS[i]) { prevScore = LEVEL_THRESHOLDS[i]; break; } }
      
      const progress = Math.min(100, Math.max(0, ((score - prevScore) / (nextScore - prevScore)) * 100));

      setGameOverStats({
        title,
        spaceFact: fact,
        nextLevelProgress: progress,
        killerType: lastDeath?.killer || 'UNKNOWN',
        killerColor: lastDeath?.color || '#fff'
      });
    }
  }, [lives, gameState, score, highScore, lastDeath]);

  useEffect(() => {
    if (bgMusicRef.current) {
        if (muted) bgMusicRef.current.pause();
        else if (gameState === 'playing') bgMusicRef.current.play().catch(() => {});
    }
  }, [muted]);

  const currentPlanet = PLANETS[Math.min(level - 1, PLANETS.length - 1)];

  return (
    <div className={`h-screen w-screen overflow-hidden relative flex items-center justify-center bg-black transition-colors duration-1000 ${dangerAlert ? 'animate-[pulse_0.5s_ease-in-out_infinite] bg-red-900/20' : ''}`}>
      
      {/* Dynamic Background Planet */}
      <div className="absolute inset-0 z-0 transition-opacity duration-1000"
        style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2072&auto=format&fit=crop')",
            backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.9
        }}
      />
      
      {/* Rotator */}
      <div className={`absolute inset-0 flex items-center justify-center z-0 pointer-events-none transition-all duration-1000 ${darkMode ? 'opacity-40 grayscale-[50%]' : 'opacity-80'}`}>
         <div className="w-[85vw] h-[85vw] max-w-[850px] max-h-[850px] rounded-full shadow-[0_0_100px_rgba(50,100,255,0.4)] animate-[spin_120s_linear_infinite]"
              style={{ backgroundImage: `url('${currentPlanet.img}')`, backgroundSize: 'cover' }}
         />
      </div>
      
      {/* Visibility Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none"></div>

      {dangerAlert && (
          <div className="absolute top-0 w-full z-40 pointer-events-none flex items-center justify-center bg-red-600/10">
              <div className="bg-red-600/80 text-white font-black text-2xl md:text-3xl py-2 px-12 animate-pulse border-b-4 border-white shadow-[0_0_50px_rgba(220,38,38,0.8)]">
                  ⚠ WARNING: MASSIVE SIGNAL DETECTED ⚠
              </div>
          </div>
      )}

      {/* Cocomelon-style Happy Music */}
      <audio ref={bgMusicRef} loop preload="auto">
        <source src="https://cdn.pixabay.com/audio/2024/09/20/audio_731557007a.mp3" type="audio/mpeg"/>
      </audio>
      
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button onClick={() => setDarkMode(!darkMode)} className="bg-slate-900/80 text-white p-3 rounded-full hover:bg-slate-700 transition-all border border-slate-600 shadow-lg backdrop-blur-sm">
          {darkMode ? '🌑' : '☀️'}
        </button>
        <button onClick={() => { setMuted(!muted); if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume(); }} className="bg-slate-900/80 text-white p-3 rounded-full hover:bg-slate-700 transition-all border border-slate-600 shadow-lg backdrop-blur-sm">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {achievements.length > 0 && (
        <div className="absolute top-20 right-1/2 translate-x-1/2 md:translate-x-0 md:right-10 z-50 animate-bounce pointer-events-none whitespace-nowrap flex flex-col items-center">
          {achievements.map((a, i) => (
            <div key={i} className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-black italic tracking-widest px-8 py-3 rounded-lg shadow-[0_0_20px_rgba(251,191,36,0.5)] mb-2 border-2 border-white transform -skew-x-12 text-xl">
              {a}
            </div>
          ))}
        </div>
      )}

      {planetNotification && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-center bg-black/60 rounded-xl px-8 py-2 backdrop-blur-sm animate-pulse border border-cyan-500/30">
              <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 tracking-tighter">
                  {currentPlanet.name}
              </h2>
          </div>
      )}

      {activeFact && gameState === 'playing' && (
          <div className="absolute top-1/4 w-full text-center z-40 pointer-events-none px-4">
              <div className="inline-block bg-purple-900/80 backdrop-blur-md border-2 border-purple-400 p-6 rounded-2xl shadow-[0_0_50px_rgba(192,132,252,0.6)] animate-pulse">
                  <h3 className="text-purple-300 text-xs font-bold tracking-[0.3em] mb-2">MATRIX DATA UPLOAD</h3>
                  <p className="text-white text-xl md:text-2xl font-black font-mono leading-tight max-w-2xl">
                      "{activeFact}"
                  </p>
              </div>
          </div>
      )}

      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="text-center max-w-2xl w-full bg-slate-900/90 border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            
            {gameState === 'menu' && (
                <>
                <div className="text-8xl mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">🚀</div>
                <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tight">SPACE DEFENDER</h1>
                
                <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl mb-4 border border-yellow-500/30">
                    <div className="text-left">
                         <div className="text-xs text-gray-400">BANK</div>
                         <div className="text-2xl font-bold text-yellow-400">${currency}</div>
                    </div>
                    <button onClick={() => setGameState('shop')} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                        🛒 OPEN SHOP
                    </button>
                </div>
                </>
            )}

            {gameState === 'shop' && (
                <>
                <h2 className="text-4xl font-black text-yellow-400 mb-6">GALACTIC ARMORY</h2>
                <div className="text-right text-xl font-bold text-yellow-400 mb-4">BALANCE: ${currency}</div>
                <div className="grid gap-4 mb-8">
                    {SHOP_ITEMS.map(item => (
                        <div key={item.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700">
                            <div className="flex items-center gap-4 text-left">
                                <div className="text-4xl">{item.icon}</div>
                                <div>
                                    <div className="font-bold text-white text-lg">{item.name}</div>
                                    <div className="text-gray-400 text-sm">{item.desc}</div>
                                </div>
                            </div>
                            {/* @ts-ignore */}
                            {inventory[item.id] ? (
                                <span className="text-green-400 font-bold px-4">OWNED</span>
                            ) : (
                                <button onClick={() => buyItem(item)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                    <span>${item.cost}</span>
                                    {currency < item.cost && <span className="text-red-300 text-xs">(Need ${item.cost - currency})</span>}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={() => setGameState('menu')} className="text-gray-400 hover:text-white underline">Back to Menu</button>
                </>
            )}

            {gameState === 'gameover' && (
                <>
                <div className="mb-6 relative inline-block">
                    <div className="text-6xl animate-pulse grayscale" style={{color: gameOverStats.killerColor}}>
                        {gameOverStats.killerType === 'ASTEROID' && '☄️'}
                        {gameOverStats.killerType === 'INVADER' && '👾'}
                        {gameOverStats.killerType === 'BOSS' && '🛸'}
                        {gameOverStats.killerType === 'PLASMA' && '⚡'}
                        {gameOverStats.killerType === 'SPACE MINE' && '💣'}
                        {gameOverStats.killerType === 'UNKNOWN' && '💀'}
                    </div>
                    <div className="text-red-500 font-bold tracking-widest text-xs mt-2 uppercase">TERMINATED BY {gameOverStats.killerType}</div>
                </div>

                <h1 className="text-5xl font-black mb-4 text-white tracking-tight">{gameOverStats.title}</h1>
                
                <div className="bg-slate-800/80 rounded-xl p-6 mb-8 border border-red-500/30 relative overflow-hidden">
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-left">
                            <p className="text-sm text-gray-400">FINAL SCORE</p>
                            <p className="text-4xl font-bold text-white">{score}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-500">BEST</p>
                             <p className="text-xl text-yellow-500">{highScore}</p>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Level {level}</span>
                        <span>{Math.round(gameOverStats.nextLevelProgress)}% to Next Rank</span>
                    </div>
                </div>
                </>
            )}
            
            {gameState !== 'shop' && (
                <button onClick={startGame} className={`w-full bg-gradient-to-r ${gameState === 'menu' ? 'from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500' : 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'} text-white font-black py-6 px-12 rounded-xl text-3xl shadow-[0_0_30px_rgba(0,0,0,0.4)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transform hover:scale-[1.02] active:scale-[0.98] transition-all`}>
                {gameState === 'menu' ? 'LAUNCH MISSION' : 'RE-ENGAGE'}
                </button>
            )}
            
            {gameState === 'menu' && (
                <div className="mt-4 text-gray-400 text-sm">
                    Hold <strong>SHIFT</strong> to use TIME WARP!
                </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className={`z-10 shadow-2xl ${isMobile ? 'w-full h-full' : 'rounded-lg border-2 border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)]'}`} />

      {isMobile && gameState === 'playing' && (
        <>
        <button onTouchStart={(e) => { e.preventDefault(); gameRef.current.keys['Shift'] = true; }} onTouchEnd={(e) => { e.preventDefault(); gameRef.current.keys['Shift'] = false; }} className="fixed bottom-10 left-8 bg-blue-500/20 backdrop-blur-md text-blue-500 font-bold w-20 h-20 rounded-full border-4 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)] z-40 active:bg-blue-500 active:text-white transition-all flex items-center justify-center text-sm">WARP</button>
        <button onTouchStart={(e) => {
            e.preventDefault(); const g = gameRef.current;
            const ship = g.ships[0];
            if (!ship || !ship.active) return;
            if (performance.now() < g.fireCooldowns[0]) return;
            const cooldown = 90 - (ship.weaponLevel * 10);
            g.fireCooldowns[0] = performance.now() + Math.max(40, cooldown);
            playSound('shoot'); const bWidth = 3; const bHeight = 16;
            const midX = ship.x + ship.width / 2;
            const noseY = ship.y;
            const bSpeed = 18;
            if (ship.weaponLevel === 1) {
                g.bullets.push({ x: midX - bWidth/2, y: noseY, width: bWidth, height: bHeight, speed: bSpeed, vx: 0 });
            } else if (ship.weaponLevel === 2) {
                g.bullets.push({ x: midX - 8, y: noseY + 4, width: bWidth, height: bHeight, speed: bSpeed, vx: 0 });
                g.bullets.push({ x: midX + 8, y: noseY + 4, width: bWidth, height: bHeight, speed: bSpeed, vx: 0 });
            } else {
                g.bullets.push({ x: midX - bWidth/2, y: noseY, width: bWidth, height: bHeight, speed: bSpeed, vx: 0 });
                g.bullets.push({ x: midX - 12, y: noseY + 6, width: bWidth, height: bHeight, speed: bSpeed, vx: -1 }); 
                g.bullets.push({ x: midX + 12, y: noseY + 6, width: bWidth, height: bHeight, speed: bSpeed, vx: 1 });  
            }
          }}
          className="fixed bottom-10 right-8 bg-red-500/20 backdrop-blur-md text-red-500 font-bold w-24 h-24 rounded-full border-4 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] z-40 active:bg-red-500 active:text-white transition-all flex items-center justify-center text-xl tracking-widest"
        > FIRE </button>
        </>
      )}
    </div>
  );
}
// Keep all your interfaces, constants, and the SpaceDefender function

// At the very end, add:
export default SpaceDefender;
