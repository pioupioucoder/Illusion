import * as THREE from 'three';

export function buildEternalWorld(scene) {
    // ─── TEXTURES ────────────────────────────────────────────────────
    function makeTex(fn, size = 128) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const x = c.getContext('2d');
        fn(x, size);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }

    const grassTex = makeTex((x, s) => {
        x.fillStyle = '#1a2a1a';
        x.fillRect(0, 0, s, s);
        for (let i = 0; i < 500; i++) {
            const h = 80 + Math.random() * 40;
            const v = 60 + Math.random() * 30;
            x.fillStyle = `hsl(${140 + Math.random() * 30}, ${30 + Math.random() * 30}%, ${15 + Math.random() * 15}%)`;
            x.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        for (let i = 0; i < 120; i++) {
            const gx = Math.random() * s, gy = Math.random() * s;
            x.strokeStyle = `hsl(${140 + Math.random() * 20}, 40%, ${18 + Math.random() * 12}%)`;
            x.lineWidth = 0.6;
            x.beginPath();
            x.moveTo(gx, gy + 4);
            x.lineTo(gx + 1, gy);
            x.stroke();
        }
    }, 128);
    grassTex.repeat.set(30, 30);

    const mGrass = new THREE.MeshLambertMaterial({ map: grassTex });
    const mTrunk = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
    const mTree = new THREE.MeshLambertMaterial({ color: 0x1a3a1a });
    const mTree2 = new THREE.MeshLambertMaterial({ color: 0x1a2a1a });
    const mBush = new THREE.MeshLambertMaterial({ color: 0x1a2a12 });

    // ─── CHUNK SYSTEM ────────────────────────────────────────────────
    const CHUNK_SIZE = 60;
    const CHUNK_RADIUS = 4;
    const activeChunks = new Map();
    let lastChunkX = Infinity, lastChunkZ = Infinity;

    // ─── Zone Illusion (pour supprimer la végétation) ──────────────
    const ILLUSION_CENTER_X = 200;
    const ILLUSION_CENTER_Z = 0;
    const ILLUSION_RADIUS = 100; // Rayon large pour être sûr

    function isInsideIllusionZone(x, z) {
        const dx = x - ILLUSION_CENTER_X;
        const dz = z - ILLUSION_CENTER_Z;
        return (dx*dx + dz*dz) < (ILLUSION_RADIUS * ILLUSION_RADIUS);
    }

    function seededRand(x, z, salt = 0) {
        const n = Math.sin(x * 127.1 + z * 311.7 + salt * 91.3) * 43758.5453;
        return n - Math.floor(n);
    }

    function makeTree(group, lx, lz, h = 5) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, h * 0.5, 6), mTrunk);
        trunk.position.set(lx, h * 0.25, lz);
        trunk.castShadow = true;
        group.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), Math.random() < 0.5 ? mTree : mTree2);
        const sc = 0.8 + Math.random() * 0.6;
        crown.scale.set(sc * h * 0.35, sc * h * 0.28, sc * h * 0.35);
        crown.position.set(lx, h * 0.65 + Math.random() * 0.3, lz);
        crown.castShadow = true;
        group.add(crown);
    }

    function makeBush(group, lx, lz, sz = 1.0) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), mBush);
        bush.scale.set(sz, sz * 0.6, sz);
        bush.position.set(lx, sz * 0.3, lz);
        group.add(bush);
    }

    function generateChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (activeChunks.has(key)) return;

        const group = new THREE.Group();
        const worldX = cx * CHUNK_SIZE;
        const worldZ = cz * CHUNK_SIZE;

        // ─── Sol ──────────────────────────────────────────────────
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE), mGrass);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(worldX, -0.02, worldZ);
        ground.receiveShadow = true;
        group.add(ground);

        const rng = (s) => seededRand(cx, cz, s);

        // ─── Arbres ──────────────────────────────────────────────
        const numTrees = Math.floor(rng(1) * 6) + 3;
        for (let t = 0; t < numTrees; t++) {
            const lx = worldX + (rng(cx * 13 + t, cz, 2) - 0.5) * CHUNK_SIZE * 0.92;
            const lz = worldZ + (rng(cx, cz * 17 + t, 3) - 0.5) * CHUNK_SIZE * 0.92;
            if (isInsideIllusionZone(lx, lz)) continue;
            const h = 4 + rng(cx * t + 7, cz, 6) * 5;
            makeTree(group, lx, lz, h);
        }

        // ─── Buissons ────────────────────────────────────────────
        const numBush = Math.floor(rng(10) * 4);
        for (let b = 0; b < numBush; b++) {
            const lx = worldX + (rng(cx + b * 11, cz, 11) - 0.5) * CHUNK_SIZE * 0.85;
            const lz = worldZ + (rng(cx, cz + b * 7, 12) - 0.5) * CHUNK_SIZE * 0.85;
            if (isInsideIllusionZone(lx, lz)) continue;
            const sz = 0.6 + rng(b + 15) * 1.0;
            makeBush(group, lx, lz, sz);
        }

        // ─── Rochers ─────────────────────────────────────────────
        const numRocks = Math.floor(rng(30) * 3);
        for (let r = 0; r < numRocks; r++) {
            const lx = worldX + (rng(cx + r * 5, cz, 31) - 0.5) * CHUNK_SIZE * 0.8;
            const lz = worldZ + (rng(cx, cz + r * 7, 32) - 0.5) * CHUNK_SIZE * 0.8;
            if (isInsideIllusionZone(lx, lz)) continue;
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.08 + rng(r + 33) * 0.25, 0),
                new THREE.MeshLambertMaterial({ color: 0x3a3a44 })
            );
            rock.position.set(lx, 0.04, lz);
            rock.rotation.set(rng(40) * 6, rng(41) * 6, 0);
            group.add(rock);
        }

        // Marqueur pour identifier les chunks (utile si on veut les supprimer plus tard)
        group.userData.isChunk = true;
        scene.add(group);
        activeChunks.set(key, group);
    }

    function disposeChunk(key) {
        const group = activeChunks.get(key);
        if (!group) return;
        group.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
        });
        scene.remove(group);
        activeChunks.delete(key);
    }

    function updateChunks(px, pz) {
        const pcx = Math.round(px / CHUNK_SIZE);
        const pcz = Math.round(pz / CHUNK_SIZE);
        const needed = new Set();
        for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
            for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
                const key = `${pcx+dx},${pcz+dz}`;
                needed.add(key);
                generateChunk(pcx + dx, pcz + dz);
            }
        }
        for (const [key] of activeChunks) {
            if (!needed.has(key)) disposeChunk(key);
        }
    }

    // ─── Initialisation des chunks autour de la maison Illusion ──
    // Au lieu de (0,0), on charge autour de (200,0) où se trouve la maison.
    updateChunks(200, 0);

    // ─── CIEL, LUNE, ÉTOILES ────────────────────────────────────────
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d');
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#050510');
    grad.addColorStop(0.3, '#0a0a2a');
    grad.addColorStop(0.6, '#0a1220');
    grad.addColorStop(0.85, '#0e1a2a');
    grad.addColorStop(1, '#1a1a2a');
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 1, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const skySphere = new THREE.Mesh(new THREE.SphereGeometry(2000, 16, 12), skyMat);
    scene.add(skySphere);

    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff8e8 });
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(45, 16, 12), moonMat);
    moonMesh.position.set(-180, 320, -600);
    scene.add(moonMesh);

    const MOON_ANGULAR_SPEED = 0.000005;
    let moonAngle = 0;

    // Étoiles
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = [], starSizes = [];
    for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.7;
        const r = 1800 + Math.random() * 200;
        starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 200, r * Math.sin(phi) * Math.sin(theta));
        starSizes.push(0.8 + Math.random() * 2.2);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
        color: 0xffffff, size: 3.5, sizeAttenuation: true,
        transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
    });
    const starsMesh = new THREE.Points(starGeo, starMat);
    scene.add(starsMesh);

    const starCountBig = 150;
    const starGeoBig = new THREE.BufferGeometry();
    const bigPos = [], bigSizes = [];
    for (let i = 0; i < starCountBig; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.7;
        const r = 1800 + Math.random() * 200;
        bigPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 200, r * Math.sin(phi) * Math.sin(theta));
        bigSizes.push(1.5 + Math.random() * 2.5);
    }
    starGeoBig.setAttribute('position', new THREE.Float32BufferAttribute(bigPos, 3));
    starGeoBig.setAttribute('size', new THREE.Float32BufferAttribute(bigSizes, 1));
    const starMatBig = new THREE.PointsMaterial({
        color: 0xffffff, size: 5.0, sizeAttenuation: true,
        transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
    });
    const starsMeshBig = new THREE.Points(starGeoBig, starMatBig);
    scene.add(starsMeshBig);

    // Étoiles filantes
    const shootingStars = [];
    const LUNAR_CYCLE = 2 * Math.PI / MOON_ANGULAR_SPEED;
    const scheduledStars = new Map();
    let currentCycle = -1;

    function planShootingStarsForCycle(cycleNum) {
        const rand = Math.random();
        let count = 0;
        if (rand < 0.5) count = 0;
        else if (rand < 0.85) count = 1;
        else count = 2;
        if (count === 0) return;
        const offsets = [];
        for (let i = 0; i < count; i++) offsets.push(Math.random() * LUNAR_CYCLE);
        scheduledStars.set(cycleNum, offsets);
    }

    function spawnShootingStar() {
        const startX = (Math.random() - 0.5) * 800;
        const startY = 100 + Math.random() * 200;
        const startZ = (Math.random() - 0.5) * 800 - 200;
        const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            -0.3 - Math.random() * 0.4,
            (Math.random() - 0.5) * 0.6
        ).normalize();
        const speed = 50 + Math.random() * 80;
        const points = [];
        const len = 20;
        for (let i = 0; i < len; i++) points.push(new THREE.Vector3(0, 0, 0));
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.9 });
        const line = new THREE.Line(geom, mat);
        line.position.set(startX, startY, startZ);
        scene.add(line);
        const dotMat = new THREE.PointsMaterial({ color: 0x88ccff, size: 2.5, transparent: true, opacity: 1 });
        const dotGeo = new THREE.BufferGeometry();
        const dotPos = new Float32Array([0, 0, 0]);
        dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
        const dot = new THREE.Points(dotGeo, dotMat);
        line.add(dot);
        shootingStars.push({
            mesh: line, dot, dir, speed, life: 0.4 + Math.random() * 0.3, age: 0,
            trail: points, len, active: true
        });
    }

    function updateShootingStars(dt) {
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            s.age += dt;
            if (s.age > s.life) {
                scene.remove(s.mesh);
                shootingStars.splice(i, 1);
                continue;
            }
            const step = s.dir.clone().multiplyScalar(s.speed * dt);
            s.mesh.position.add(step);
            const pos = s.mesh.position;
            const trail = s.trail;
            for (let j = trail.length - 1; j > 0; j--) trail[j].copy(trail[j - 1]);
            trail[0].copy(pos);
            s.mesh.geometry.setFromPoints(trail);
            s.mesh.geometry.attributes.position.needsUpdate = true;
            const alpha = 1 - (s.age / s.life);
            s.mesh.material.opacity = alpha * 0.9;
            s.dot.material.opacity = alpha;
        }

        const newCycle = Math.floor(moonAngle / (2 * Math.PI));
        if (newCycle !== currentCycle) {
            currentCycle = newCycle;
            planShootingStarsForCycle(currentCycle);
        }
        if (scheduledStars.has(currentCycle)) {
            const offsets = scheduledStars.get(currentCycle);
            const cycleTime = moonAngle % (2 * Math.PI) / MOON_ANGULAR_SPEED;
            if (!scheduledStars._triggered) scheduledStars._triggered = [];
            for (let off of offsets) {
                if (cycleTime >= off && !scheduledStars._triggered.includes(off)) {
                    spawnShootingStar();
                    scheduledStars._triggered.push(off);
                }
            }
            if (scheduledStars._triggered.length === offsets.length) {
                scheduledStars.delete(currentCycle);
            }
        }
    }

    // Nuages
    const cloudMat = new THREE.MeshBasicMaterial({
        color: 0x1a1a2e, transparent: true, opacity: 0.55, side: THREE.DoubleSide
    });
    const cloudMat2 = new THREE.MeshBasicMaterial({
        color: 0x22223a, transparent: true, opacity: 0.40, side: THREE.DoubleSide
    });
    const WIND_DIR = new THREE.Vector2(-0.7, -0.3).normalize();
    const WIND_SPEED = 1.2;
    const clouds = [];

    function makeCloud(x, y, z, scale = 1) {
        const g = new THREE.Group();
        const blobs = [
            [0, 0, 4, 1.4, 3, cloudMat],
            [3.2, 0.5, 3, 1.5, 2.4, cloudMat2],
            [-3, 0.4, 2.8, 1.2, 2.2, cloudMat2],
            [1, -0.4, 2.2, 1, 1.8, cloudMat],
            [-1.5, -0.3, 2, 0.9, 1.6, cloudMat],
            [0, 0.8, 2.5, 1, 2, cloudMat2]
        ];
        blobs.forEach(([dx, dy, w, h, d, mat]) => {
            const c = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), mat);
            c.scale.set(w * scale, h * scale, d * scale);
            c.position.set(dx * scale, dy * scale, 0);
            g.add(c);
        });
        g.position.set(x, y, z);
        scene.add(g);
        clouds.push({
            group: g, baseX: x, baseZ: z, y, phase: Math.random() * Math.PI * 2,
            speedMul: 0.7 + Math.random() * 0.6,
            oscAmp: 2 + Math.random() * 4,
            oscFreq: 0.02 + Math.random() * 0.02
        });
    }
    for (let i = 0; i < 25; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 400;
        const x = Math.cos(ang) * dist;
        const z = Math.sin(ang) * dist - 100;
        const y = 40 + Math.random() * 60;
        const sc = 0.8 + Math.random() * 1.8;
        makeCloud(x, y, z, sc);
    }

    // Oiseaux
    const birdMatWing = new THREE.MeshLambertMaterial({ color: 0x1a1a22, side: THREE.DoubleSide });
    const birdFlock = [];
    const birdGroup = new THREE.Group();
    scene.add(birdGroup);
    for (let i = 0; i < 20; i++) {
        const b = {
            x: (Math.random() - 0.5) * 500,
            y: 20 + Math.random() * 40,
            z: -50 - Math.random() * 400,
            speed: 2 + Math.random() * 4,
            phase: Math.random() * Math.PI * 2,
            radius: 80 + Math.random() * 150,
            angle: Math.random() * Math.PI * 2,
            wingPhase: Math.random() * Math.PI * 2,
            flapSpeed: 3 + Math.random() * 2
        };
        const leftWing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.25), birdMatWing);
        const rightWing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.25), birdMatWing);
        leftWing.position.set(-0.45, 0, 0);
        rightWing.position.set(0.45, 0, 0);
        const birdObj = new THREE.Group();
        birdObj.add(leftWing);
        birdObj.add(rightWing);
        birdObj.position.set(b.x, b.y, b.z);
        birdObj.rotation.y = Math.random() * Math.PI * 2;
        birdGroup.add(birdObj);
        b.mesh = birdObj;
        b.lw = leftWing;
        b.rw = rightWing;
        birdFlock.push(b);
    }

    // ─── Mise à jour ────────────────────────────────────────────────────
    return {
        update: function(cameraPos, dt, time) {
            const px = cameraPos.x;
            const pz = cameraPos.z;
            const curCX = Math.round(px / CHUNK_SIZE);
            const curCZ = Math.round(pz / CHUNK_SIZE);
            if (curCX !== lastChunkX || curCZ !== lastChunkZ) {
                lastChunkX = curCX;
                lastChunkZ = curCZ;
                updateChunks(px, pz);
            }

            // Nuages
            const cloudTime = time;
            const windOffset = new THREE.Vector2(
                WIND_DIR.x * WIND_SPEED * cloudTime,
                WIND_DIR.y * WIND_SPEED * cloudTime
            );
            clouds.forEach(c => {
                const baseX = c.baseX + windOffset.x;
                const baseZ = c.baseZ + windOffset.y;
                const oscX = Math.sin(cloudTime * c.oscFreq + c.phase) * c.oscAmp;
                const oscZ = Math.cos(cloudTime * c.oscFreq * 0.7 + c.phase * 1.3) * c.oscAmp * 0.6;
                c.group.position.x = baseX + oscX;
                c.group.position.z = baseZ + oscZ;
                c.group.rotation.y += dt * 0.003;
            });

            // Oiseaux
            birdFlock.forEach((b, i) => {
                b.angle += (b.speed * 0.006 + i * 0.001) * dt;
                b.x = Math.sin(b.angle * 0.7 + b.phase) * b.radius + px;
                b.z = Math.cos(b.angle * 0.5 + b.phase) * b.radius + pz - 80;
                b.y = 20 + Math.sin(b.angle * 1.2) * 6 + i * 2.2;
                b.mesh.position.set(b.x, b.y, b.z);
                b.mesh.rotation.y = b.angle * 0.7 + b.phase + Math.PI / 2;
                b.wingPhase += dt * b.flapSpeed;
                const flap = Math.sin(b.wingPhase) * 0.45;
                b.lw.rotation.z = flap;
                b.rw.rotation.z = -flap;
            });

            // Lune
            moonAngle += MOON_ANGULAR_SPEED * dt;
            const moonRadius = 400;
            const moonHeight = 280;
            moonMesh.position.x = Math.sin(moonAngle) * moonRadius;
            moonMesh.position.z = Math.cos(moonAngle) * moonRadius - 300;
            moonMesh.position.y = moonHeight + Math.sin(moonAngle * 0.7) * 30;

            // Ciel et étoiles suivent le joueur
            skySphere.position.set(px, 0, pz);
            starsMesh.position.set(px, 0, pz);
            starsMeshBig.position.set(px, 0, pz);

            // Scintillement
            const starTwinkle = time;
            const twinkleFactor = 0.8 + 0.2 * Math.sin(starTwinkle * 0.5);
            starMat.opacity = 0.7 + 0.3 * twinkleFactor;
            starMatBig.opacity = 0.7 + 0.3 * Math.sin(starTwinkle * 0.7 + 1.2);
            starMat.size = 3.5 + 0.5 * Math.sin(starTwinkle * 0.3);
            starMatBig.size = 5.0 + 0.8 * Math.sin(starTwinkle * 0.4 + 0.5);

            updateShootingStars(dt);
        }
    };
}