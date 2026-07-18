// illusion.js – version complète et corrigée
import * as THREE from 'three';

export function buildIllusionWorld(scene, camera, canvas) {
    // ─── LUMIÈRES ──────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x887868, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffe8c0, 0.9);
    sun.position.set(4, 10, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 20;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8899bb, 0.3);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    // ─── TEXTURES ────────────────────────────────────────────────────
    function makeTex(fn, size) {
        size = size || 128;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        fn(ctx, size);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }

    const stoneTex = makeTex(function(ctx, s) {
        ctx.fillStyle = '#b8a888';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * s,
                y = Math.random() * s;
            const r = 180 + Math.random() * 40,
                g = 160 + Math.random() * 30,
                b = 130 + Math.random() * 30;
            ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
            ctx.fillRect(x, y, 6 + Math.random() * 14, 6 + Math.random() * 12);
        }
        ctx.strokeStyle = 'rgba(80,70,55,0.12)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < s; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(s, i);
            ctx.stroke();
        }
    }, 128);
    stoneTex.repeat.set(3, 3);

    const floorTex = makeTex(function(ctx, s) {
        ctx.fillStyle = '#4a3828';
        ctx.fillRect(0, 0, s, s);
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const v = 70 + Math.random() * 30;
                ctx.fillStyle = 'rgb(' + (v + 20) + ',' + (v - 10) + ',' + (v - 30) + ')';
                ctx.fillRect(col * 12 + 1, row * 12 + 1, 10, 10);
            }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= s; i += 12) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(s, i);
            ctx.stroke();
        }
    }, 120);
    floorTex.repeat.set(8, 8);

    const floorTexCorridor = makeTex(function(ctx, s) {
        ctx.fillStyle = '#2a0606';
        ctx.fillRect(0, 0, s, s);
        const cell = s / 4;
        for (let r = 0; r < 4; r++) {
            for (let col = 0; col < 4; col++) {
                const dark = (r + col) % 2 === 0;
                ctx.fillStyle = dark ? '#7a0f10' : '#160303';
                ctx.save();
                ctx.translate(col * cell + cell / 2, r * cell + cell / 2);
                ctx.rotate(Math.PI / 4);
                const d = cell * 0.62;
                ctx.fillRect(-d / 2, -d / 2, d, d);
                ctx.restore();
            }
        }
        ctx.strokeStyle = 'rgba(180,120,40,0.25)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= s; i += cell) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(s, i);
            ctx.stroke();
        }
    }, 128);
    floorTexCorridor.repeat.set(6, 6);

    const woodTex = makeTex(function(ctx, s) {
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < s; i += 3) {
            ctx.fillStyle = 'hsl(28,' + (25 + Math.random() * 15) + '%,' + (20 + Math.random() * 12) + '%)';
            ctx.fillRect(0, i, s, 2);
        }
    }, 64);
    woodTex.repeat.set(4, 4);

    // ─── MATÉRIAUX ──────────────────────────────────────────────────
    const mWall = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0xddd0b8 });
    const mWallCorridor = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0x9a6858 });
    const mFloor = new THREE.MeshLambertMaterial({ map: floorTex, color: 0x6a5848 });
    const mWood = new THREE.MeshLambertMaterial({ map: woodTex, color: 0x7a5a38 });
    const mGlass = new THREE.MeshLambertMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const mCeil = new THREE.MeshLambertMaterial({ color: 0xddd0c0 });
    const mDoor = new THREE.MeshLambertMaterial({ map: woodTex, color: 0x6a4a30 });
    const mHandle = new THREE.MeshLambertMaterial({ color: 0xccaa88 });
    const mDoorFrame = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
    const mDoorHighlight = new THREE.MeshLambertMaterial({ map: woodTex, color: 0x8a6a50, emissive: 0x442200, emissiveIntensity: 0.3 });

    // ─── HELPERS ──────────────────────────────────────────────────
    function box(w, h, d, mat, x, y, z, rx, ry, rz) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        if (rz) m.rotation.z = rz;
        m.castShadow = true;
        m.receiveShadow = true;
        scene.add(m);
        return m;
    }

    function plane(w, h, mat, x, y, z, rx, ry, rz) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        if (rz) m.rotation.z = rz;
        scene.add(m);
        return m;
    }

    function cylinder(rt, rb, h, seg, mat, x, y, z, rx, ry, rz) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        if (rz) m.rotation.z = rz;
        m.castShadow = true;
        scene.add(m);
        return m;
    }

    // ─── DIMENSIONS ──────────────────────────────────────────────
    const WALL_H = 3.6;
    const ROOM_W = 16;
    const ROOM_D = 16;

    // ─── SOLS ──────────────────────────────────────────────────────
    const floorMatOrig = new THREE.MeshLambertMaterial({ map: floorTex, color: 0x6a5848 });
    const floorMatDamier = new THREE.MeshLambertMaterial({ map: floorTexCorridor, color: 0x8a4a4a });

    const halfDepth = ROOM_D / 2 + 0.1;
    const halfW = ROOM_W / 2 + 0.1;

    const floorLeft = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W + 0.2, halfDepth), floorMatDamier);
    floorLeft.rotation.x = -Math.PI / 2;
    floorLeft.position.set(0, -0.01, -halfDepth / 2);
    floorLeft.receiveShadow = true;
    scene.add(floorLeft);

    const floorRight = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W + 0.2, halfDepth), floorMatOrig);
    floorRight.rotation.x = -Math.PI / 2;
    floorRight.position.set(0, -0.01, halfDepth / 2);
    floorRight.receiveShadow = true;
    scene.add(floorRight);

    // ─── MURS EXTÉRIEURS ──────────────────────────────────────────
    plane(ROOM_W, WALL_H, mWallCorridor, 0, WALL_H / 2, -ROOM_D / 2, 0, 0);
    plane(ROOM_D / 2, WALL_H, mWallCorridor, -ROOM_W / 2, WALL_H / 2, -ROOM_D / 4, 0, Math.PI / 2);
    plane(ROOM_D / 2, WALL_H, mWall, -ROOM_W / 2, WALL_H / 2, ROOM_D / 4, 0, Math.PI / 2);
    plane(ROOM_D / 2, WALL_H, mWallCorridor, ROOM_W / 2, WALL_H / 2, -ROOM_D / 4, 0, -Math.PI / 2);
    plane(ROOM_D / 2, WALL_H, mWall, ROOM_W / 2, WALL_H / 2, ROOM_D / 4, 0, -Math.PI / 2);

    // ─── MUR CENTRAL – PORTE INTÉRIEURE ──────────────────────────
    (function() {
        const doorW = 1.2, doorH = 2.2;
        const doorZ = 0, doorX = 0;
        const wallThick = 0.3;
        const wallMat = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0xddd0b8, side: THREE.DoubleSide });

        const leftW = -doorW / 2 - (-ROOM_W / 2);
        if (leftW > 0.01) {
            const leftBlock = new THREE.Mesh(new THREE.BoxGeometry(leftW, WALL_H, wallThick), wallMat);
            leftBlock.position.set((-ROOM_W / 2 + (-doorW / 2)) / 2, WALL_H / 2, doorZ);
            leftBlock.castShadow = true; leftBlock.receiveShadow = true;
            scene.add(leftBlock);
        }
        const rightW = ROOM_W / 2 - doorW / 2;
        if (rightW > 0.01) {
            const rightBlock = new THREE.Mesh(new THREE.BoxGeometry(rightW, WALL_H, wallThick), wallMat);
            rightBlock.position.set((doorW / 2 + ROOM_W / 2) / 2, WALL_H / 2, doorZ);
            rightBlock.castShadow = true; rightBlock.receiveShadow = true;
            scene.add(rightBlock);
        }
        const topH = WALL_H - doorH;
        if (topH > 0.01) {
            const topBlock = new THREE.Mesh(new THREE.BoxGeometry(doorW * 1.6, topH, wallThick), wallMat);
            topBlock.position.set(doorX, (doorH + WALL_H) / 2, doorZ);
            topBlock.castShadow = true; topBlock.receiveShadow = true;
            scene.add(topBlock);
        }

        const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.1, roughness: 0.6, side: THREE.DoubleSide });
        const fw = 0.04;
        const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(fw, doorH, 0.08), frameMat);
        leftFrame.position.set(-doorW / 2 - 0.02, doorH / 2, doorZ); scene.add(leftFrame);
        const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(fw, doorH, 0.08), frameMat);
        rightFrame.position.set(doorW / 2 + 0.02, doorH / 2, doorZ); scene.add(rightFrame);
        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, 0.04, 0.08), frameMat);
        topFrame.position.set(doorX, doorH + 0.02, doorZ); scene.add(topFrame);
        const botFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, 0.03, 0.08), frameMat);
        botFrame.position.set(doorX, 0.015, doorZ); scene.add(botFrame);

        const doorMat = new THREE.MeshStandardMaterial({ color: 0xf0ece8, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide });
        const doorMatHi = new THREE.MeshStandardMaterial({ color: 0xf8f4f0, emissive: 0x443322, emissiveIntensity: 0.2, side: THREE.DoubleSide });
        const glassMatDoor = new THREE.MeshPhysicalMaterial({ color: 0xddddff, transparent: true, opacity: 0.3, roughness: 0.02, metalness: 0.0, side: THREE.DoubleSide });

        const pivotMid = new THREE.Group();
        pivotMid.position.set(-doorW / 2, doorH / 2, doorZ);
        scene.add(pivotMid);

        const doorGroupMid = new THREE.Group();
        doorGroupMid.position.set(doorW / 2, 0, 0);

        const doorMeshMid = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.035), doorMat);
        doorMeshMid.position.set(0, 0, 0);
        doorMeshMid.castShadow = true; doorMeshMid.receiveShadow = true;
        doorGroupMid.add(doorMeshMid);

        const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.7, doorH * 0.7), glassMatDoor);
        glass.position.set(0, 0, 0.02);
        doorGroupMid.add(glass);

        const hMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 });
        const hFwd = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), hMat);
        hFwd.rotation.z = Math.PI / 2;
        hFwd.position.set(0.32, -0.1, 0.04);
        doorGroupMid.add(hFwd);
        const hBaseFwd = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), hMat);
        hBaseFwd.position.set(0.38, -0.1, 0.04);
        doorGroupMid.add(hBaseFwd);
        const hBwd = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), hMat);
        hBwd.rotation.z = Math.PI / 2;
        hBwd.position.set(0.32, -0.1, -0.04);
        doorGroupMid.add(hBwd);
        const hBaseBwd = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), hMat);
        hBaseBwd.position.set(0.38, -0.1, -0.04);
        doorGroupMid.add(hBaseBwd);

        const clickAreaMid = new THREE.Mesh(
            new THREE.PlaneGeometry(doorW * 1.2, doorH * 1.2),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
        );
        clickAreaMid.position.set(0, 0, 0.02);
        clickAreaMid.userData.isClickArea = true;
        doorGroupMid.add(clickAreaMid);

        pivotMid.add(doorGroupMid);

        window._midDoorGroup = doorGroupMid;
        window._midDoorPivot = pivotMid;
        window._midDoorMesh = doorMeshMid;
        window._midDoorMat = doorMat;
        window._midDoorHighlightMat = doorMatHi;
        window._midDoorOpen = false;
        window._midDoorAnimating = false;
        window._midDoorCollision = { halfW: doorW / 2, halfH: doorH / 2, halfD: 0.035 / 2 + 0.05 };
        window._midWallLimits = {
            minX: -ROOM_W / 2, maxX: ROOM_W / 2,
            doorMinX: -doorW / 2, doorMaxX: doorW / 2,
            doorZ: doorZ, thickness: wallThick
        };
    })();

    // ─── MUR AVANT (fenêtre + porte extérieure) ──────────────────
    (function() {
        const fw = 2.8, fh = 2.0;
        const doorW = 1.2, doorH = 2.2;
        const doorX = ROOM_W / 2 - 1.8;
        const fz = ROOM_D / 2 + 0.01;
        const yc = WALL_H / 2;

        box(-fw / 2 - (-ROOM_W / 2), WALL_H, 0.05, mWall, ((-ROOM_W / 2) + (-fw / 2)) / 2, WALL_H / 2, fz);
        const xGap1 = fw / 2, xGap2 = doorX - doorW / 2;
        if (xGap2 > xGap1) {
            const w = xGap2 - xGap1;
            box(w, WALL_H, 0.05, mWall, (xGap1 + xGap2) / 2, WALL_H / 2, fz);
        }
        box(ROOM_W / 2 - (doorX + doorW / 2), WALL_H, 0.05, mWall, (doorX + doorW / 2 + ROOM_W / 2) / 2, WALL_H / 2, fz);

        const yTop = Math.max(yc + fh / 2, doorH);
        if (WALL_H > yTop) {
            box(ROOM_W, WALL_H - yTop, 0.05, mWall, 0, (yTop + WALL_H) / 2, fz);
        }
        const yBotFen = yc - fh / 2;
        if (yBotFen > 0) {
            box(fw, yBotFen - 0, 0.05, mWall, 0, (0 + yBotFen) / 2, fz);
        }
        if (yTop > doorH) {
            box(doorW, yTop - doorH, 0.05, mWall, doorX, (doorH + yTop) / 2, fz);
        }

        const mGlass2 = new THREE.MeshLambertMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        plane(fw, fh, mGlass2, 0, yc, fz + 0.01);
        const frameMat = new THREE.MeshLambertMaterial({ color: 0x4a3828 });
        [
            [fw + 0.2, 0.06, 0, fh / 2],
            [fw + 0.2, 0.06, 0, -fh / 2],
            [0.06, fh + 0.2, -fw / 2, 0],
            [0.06, fh + 0.2, fw / 2, 0]
        ].forEach(function(opt) {
            box(opt[0], opt[1], 0.05, frameMat, opt[2], yc + opt[3], fz + 0.02);
        });
        box(fw, 0.04, 0.05, frameMat, 0, yc, fz + 0.02);
        box(0.04, fh, 0.05, frameMat, 0, yc, fz + 0.02);

        const doorZ = ROOM_D / 2 + 0.02;
        const frameMatDoor = mDoorFrame;
        box(0.08, doorH, 0.08, frameMatDoor, doorX - doorW / 2 - 0.04, doorH / 2 + 0.025, doorZ);
        box(0.08, doorH, 0.08, frameMatDoor, doorX + doorW / 2 + 0.04, doorH / 2 + 0.025, doorZ);
        box(doorW + 0.16, 0.08, 0.08, frameMatDoor, doorX, doorH + 0.025 + 0.04, doorZ);

        const pivot = new THREE.Group();
        pivot.position.set(doorX - doorW / 2, doorH / 2 + 0.025, doorZ);
        scene.add(pivot);

        const doorGroup = new THREE.Group();
        doorGroup.position.set(doorW / 2, 0, 0);
        const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.04), mDoor);
        doorMesh.position.set(0, 0, 0);
        doorMesh.castShadow = true; doorMesh.receiveShadow = true;
        doorGroup.add(doorMesh);
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mHandle);
        handle.position.set(0.35, -0.2, 0.06);
        doorGroup.add(handle);
        const handleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), mHandle);
        handleBase.rotation.x = Math.PI / 2;
        handleBase.position.set(0.35, -0.2, 0.04);
        doorGroup.add(handleBase);

        const clickArea = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 1.2, doorH * 1.2),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide }));
        clickArea.position.set(0, 0, 0.02);
        clickArea.userData.isClickArea = true;
        doorGroup.add(clickArea);
        pivot.add(doorGroup);

        window._doorPivot = pivot;
        window._doorGroup = doorGroup;
        window._doorMesh = doorMesh;
        window._doorMat = mDoor;
        window._doorHighlightMat = mDoorHighlight;
        window._doorOpen = false;
        window._doorAnimating = false;
    })();

    // ─── PLAFOND ──────────────────────────────────────────────────
    plane(ROOM_W, ROOM_D, mCeil, 0, WALL_H, 0, Math.PI / 2);

   // ─── LAMPES MODERNES (2 zones) ──────────────────────────────────────

// Configuration des lampes
function setupSwitchInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredSwitch = null;

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(switchMeshes);
        let newHover = null;
        if (intersects.length > 0) {
            newHover = intersects[0].object;
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }

        if (newHover !== hoveredSwitch) {
            if (hoveredSwitch) {
                hoveredSwitch.material.color.setHex(hoveredSwitch.userData.defaultColor);
                hoveredSwitch.material.emissive.setHex(0x000000);
                hoveredSwitch.material.emissiveIntensity = 0;
            }
            if (newHover) {
                newHover.material.color.setHex(newHover.userData.hoverColor);
                newHover.material.emissive.setHex(0xffff88);
                newHover.material.emissiveIntensity = 0.3;
            }
            hoveredSwitch = newHover;
        }
    });

    canvas.addEventListener('click', (event) => {
        if (!hoveredSwitch) return;
        const lampId = hoveredSwitch.userData.lampId;
        const state = lampStates[lampId];
        lampStates[lampId] = !state;
        const data = lampMeshes[lampId];
        data.light.intensity = lampStates[lampId] ? data.light.intensity : 0;
        const newColor = lampStates[lampId] ? data.light.color : 0x444444;
        data.bulbMat.color.setHex(newColor);
        data.bulbMat.emissive.setHex(newColor);
        data.bulbMat.emissiveIntensity = lampStates[lampId] ? 0.5 : 0;
        const btn = hoveredSwitch;
        btn.userData.defaultColor = lampStates[lampId] ? 0x44aa44 : 0xaa4444;
        btn.material.color.setHex(btn.userData.defaultColor);
    });
}

setupSwitchInteractions();


    // ─── LIT ──────────────────────────────────────────────────────
    function createBed() {
        const group = new THREE.Group();
        const E = 1.1, W = 0;

        function createPatternTexture(colors, stripeWidth, bgColor) {
            const c = document.createElement('canvas');
            c.width = 256; c.height = 256;
            const ctx = c.getContext('2d');
            ctx.fillStyle = bgColor || '#f0e0d0';
            ctx.fillRect(0, 0, 256, 256);
            ctx.save();
            ctx.translate(128, 128);
            ctx.rotate(0.4);
            for (let i = -300; i < 300; i += 20) {
                ctx.fillStyle = colors[i % colors.length];
                ctx.fillRect(i, -300, stripeWidth || 8, 600);
            }
            ctx.restore();
            for (let i = 0; i < 80; i++) {
                ctx.fillStyle = colors[(i + 3) % colors.length];
                ctx.beginPath();
                ctx.arc(20 + Math.random() * 216, 20 + Math.random() * 216, 6 + Math.random() * 8, 0, Math.PI * 2);
                ctx.fill();
            }
            const t = new THREE.CanvasTexture(c);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(2, 2);
            return t;
        }
        const blanketColors = ['#e8a0b0', '#d08090', '#f0c0c8', '#c06070'];
        const blanketTex = createPatternTexture(blanketColors, 10, '#f5e0e0');

        const frameMat = new THREE.MeshLambertMaterial({ color: 0xd4b090 });
        const legMat = new THREE.MeshLambertMaterial({ color: 0xb09070 });
        const halfW = 0.6 + W/2;
        const legs = [
            [-halfW, -0.8], [halfW, -0.8],
            [-halfW, 0.8 + E], [halfW, 0.8 + E]
        ];
        legs.forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 6), legMat);
            leg.position.set(x, 0.2, z);
            leg.castShadow = true;
            group.add(leg);
        });

        const longSide = new THREE.Mesh(new THREE.BoxGeometry(1.2 + W, 0.08, 0.08), frameMat);
        longSide.position.set(0, 0.4, -0.8); group.add(longSide);
        const longSide2 = new THREE.Mesh(new THREE.BoxGeometry(1.2 + W, 0.08, 0.08), frameMat);
        longSide2.position.set(0, 0.4, 0.8 + E); group.add(longSide2);
        const shortSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6 + E), frameMat);
        shortSide.position.set(-halfW, 0.4, E/2); group.add(shortSide);
        const shortSide2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6 + E), frameMat);
        shortSide2.position.set(halfW, 0.4, E/2); group.add(shortSide2);

        const headMat = new THREE.MeshLambertMaterial({ color: 0xe0c0b0 });
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2 + W, 0.6, 0.08), headMat);
        head.position.set(0, 0.9, -0.85); group.add(head);
        const paddingMat = new THREE.MeshLambertMaterial({ color: 0xf0d8c8 });
        const pad = new THREE.Mesh(new THREE.BoxGeometry(1.1 + W, 0.5, 0.06), paddingMat);
        pad.position.set(0, 0.9, -0.89); group.add(pad);

        const btnMat = new THREE.MeshLambertMaterial({ color: 0xc09080 });
        const btnSpacingX = (0.4 + W/2) / 2;
        for (let i = -btnSpacingX; i <= btnSpacingX + 0.01; i += btnSpacingX) {
            for (let j = -0.15; j <= 0.15; j += 0.15) {
                const btn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), btnMat);
                btn.position.set(i, 0.9 + j, -0.88);
                group.add(btn);
            }
        }

        const mattressMat = new THREE.MeshLambertMaterial({ color: 0xf8f0e8 });
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.2 + W, 0.2, 1.6 + E), mattressMat);
        mattress.position.set(0, 0.5, E/2);
        mattress.castShadow = true; mattress.receiveShadow = true;
        group.add(mattress);

        const pillowMat = new THREE.MeshLambertMaterial({ color: 0xf0e8e0 });
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.6 + W*0.5, 0.12, 0.4), pillowMat);
        pillow.position.set(0, 0.7, -0.2);
        pillow.castShadow = true; pillow.receiveShadow = true;
        group.add(pillow);
        const pillowTop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), pillowMat);
        pillowTop.scale.set(0.9 + W*0.4, 0.3, 0.7);
        pillowTop.position.set(0, 0.76, -0.2);
        pillowTop.castShadow = true;
        group.add(pillowTop);

        const blanketMat = new THREE.MeshLambertMaterial({ map: blanketTex, color: 0xf0e0e0 });
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.1 + W, 0.04, 1.1 + E), blanketMat);
        blanket.position.set(0, 0.62, 0.25 + E/2);
        blanket.castShadow = true; blanket.receiveShadow = true;
        group.add(blanket);
        const foldMat = new THREE.MeshLambertMaterial({ map: blanketTex, color: 0xe8c8c8 });
        const fold = new THREE.Mesh(new THREE.BoxGeometry(1.1 + W, 0.04, 0.15), foldMat);
        fold.position.set(0, 0.63, 0.7 + E);
        group.add(fold);
        const edgeMat = new THREE.MeshLambertMaterial({ color: 0xd08090 });
        const edge = new THREE.Mesh(new THREE.BoxGeometry(1.1 + W, 0.02, 0.04), edgeMat);
        edge.position.set(0, 0.64, 0.7 + E);
        group.add(edge);

        group.position.set(-7, 0, -7.2);
        group.rotation.y = Math.PI / 2;
        scene.add(group);
    }
    createBed();

    // ─── LIVRE ──────────────────────────────────────────────────────
    function getJsonUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '/projet/Illusion/livres/mon_livre.json';
        }
        return 'https://raw.githubusercontent.com/pioupioucoder/BeYourDog/master/livres/mon_livre.json';
    }
    const JSON_URL = getJsonUrl();

    let currentPage = 0,
        totalPages = 0,
        bookData = null;

    function chargerContenuLivre(container) {
        fetch(JSON_URL)
            .then(response => {
                if (!response.ok) throw new Error("Fichier JSON introuvable !");
                return response.json();
            })
            .then(data => {
                if (!data.pages || data.pages.length === 0) {
                    data.pages = [{ numero: 1, contenu: "📖 Aucune page trouvée." }];
                }
                bookData = data;
                totalPages = data.pages.length;
                currentPage = 0;
                afficherLivre(container);
            })
            .catch(err => {
                container.innerHTML = `
                    <p style="color:#e74c3c; text-align:center; font-size:18px;">
                        ❌ Livre introuvable.<br>
                        <span style="font-size:14px; color:#aaa;">${err.message}</span><br>
                        <code style="color:#f1c40f;">${JSON_URL}</code>
                    </p>
                `;
            });
    }

    function afficherLivre(container) {
        if (!bookData || !bookData.pages) return;
        const pages = bookData.pages;
        const leftIndex = currentPage,
            rightIndex = currentPage + 1;
        container.innerHTML = '';
        container.style.cssText = `
            display: flex; flex-direction: column; align-items: center;
            background: #f5f0eb; border-radius: 12px; padding: 20px;
            min-height: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            font-family: 'Georgia', serif; position: relative;
        `;
        const header = document.createElement('div');
        header.style.cssText = `
            width: 100%; display: flex; justify-content: space-between;
            align-items: center; margin-bottom: 15px; padding-bottom: 10px;
            border-bottom: 1px solid #ddd; font-size: 14px; color: #6a5a4a;
        `;
        const leftLabel = document.createElement('span');
        leftLabel.textContent = `📖 Page ${leftIndex + 1} / ${totalPages}`;
        const rightLabel = document.createElement('span');
        rightLabel.textContent = rightIndex < totalPages ? `Page ${rightIndex + 1} / ${totalPages}` : '';
        const bookmark = document.createElement('span');
        bookmark.textContent = `🔖 Page ${currentPage + 1}`;
        bookmark.style.cssText = `
            font-size: 14px; background: #d4a373; padding: 4px 14px;
            border-radius: 4px 4px 0 0; color: white;
            box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
        `;
        header.appendChild(leftLabel);
        header.appendChild(bookmark);
        header.appendChild(rightLabel);
        container.appendChild(header);

        const bookBody = document.createElement('div');
        bookBody.style.cssText = `
            display: flex; gap: 20px; width: 100%; flex: 1;
            min-height: 300px; background: #fcf9f6; border-radius: 8px;
            padding: 15px; box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
            position: relative;
        `;
        const leftPage = createPageElement(pages[leftIndex]);
        bookBody.appendChild(leftPage);
        const separator = document.createElement('div');
        separator.style.cssText = `
            width: 2px; background: linear-gradient(to bottom, #d4c8b8, #b8a898, #d4c8b8);
            flex-shrink: 0; margin: 10px 0; box-shadow: -2px 0 8px rgba(0,0,0,0.05);
        `;
        bookBody.appendChild(separator);
        if (rightIndex < totalPages) {
            const rightPage = createPageElement(pages[rightIndex]);
            bookBody.appendChild(rightPage);
        } else {
            const emptyPage = document.createElement('div');
            emptyPage.style.cssText = `
                flex: 1; display: flex; align-items: center; justify-content: center;
                color: #aaa; font-style: italic; font-size: 16px; padding: 20px;
                background: #fcf9f6; border-radius: 4px;
            `;
            emptyPage.textContent = '✨ Fin du livre';
            bookBody.appendChild(emptyPage);
        }
        container.appendChild(bookBody);

        const nav = document.createElement('div');
        nav.style.cssText = `
            display: flex; gap: 15px; margin-top: 18px; align-items: center;
            width: 100%; justify-content: center; flex-wrap: wrap;
        `;
        const btnPrev = createNavButton('◀ Précédent', () => {
            if (currentPage > 0) {
                currentPage -= 2;
                if (currentPage < 0) currentPage = 0;
                afficherLivre(container);
            }
        }, currentPage > 0);
        const btnNext = createNavButton('Suivant ▶', () => {
            if (currentPage + 2 < totalPages) {
                currentPage += 2;
                afficherLivre(container);
            }
        }, currentPage + 2 < totalPages);
        const progress = document.createElement('span');
        progress.textContent = `${currentPage + 1} – ${Math.min(currentPage + 2, totalPages)} / ${totalPages}`;
        progress.style.cssText = `
            font-size: 13px; color: #8a7a6a; padding: 4px 12px;
            background: #ede8e0; border-radius: 20px;
        `;
        nav.appendChild(btnPrev);
        nav.appendChild(progress);
        nav.appendChild(btnNext);
        container.appendChild(nav);
    }

    function createPageElement(page) {
        const div = document.createElement('div');
        div.style.cssText = `
            flex: 1; padding: 12px 16px; background: #fcf9f6; border-radius: 4px;
            line-height: 2; font-size: 15px; color: #2c2c2c; min-height: 200px;
            max-height: 400px; overflow-y: auto; border: 1px solid #ede8e0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative;
        `;
        const num = document.createElement('span');
        num.textContent = page.numero;
        num.style.cssText = `
            position: absolute; bottom: 8px; right: 12px; font-size: 11px;
            color: #d0c8b8; font-style: italic;
        `;
        div.appendChild(num);
        const content = document.createElement('div');
        content.textContent = page.contenu;
        content.style.cssText = `
            white-space: pre-wrap; word-break: break-word;
            font-family: 'Georgia', serif; font-size: 15px; line-height: 1.9;
            color: #2c2c2c; min-height: 160px;
        `;
        div.appendChild(content);
        const lines = document.createElement('div');
        lines.style.cssText = `
            position: absolute; top: 0; left: 20px; right: 20px; bottom: 0;
            pointer-events: none; opacity: 0.08;
            background: repeating-linear-gradient(to bottom, transparent, transparent 28px, #b8a898 28px, #b8a898 29px);
        `;
        div.appendChild(lines);
        return div;
    }

    function createNavButton(label, onClick, enabled) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `
            padding: 8px 18px; border: none; border-radius: 24px;
            background: ${enabled ? '#8a7a6a' : '#ccc'};
            color: white; font-family: 'Georgia', serif; font-size: 14px;
            cursor: ${enabled ? 'pointer' : 'default'}; transition: 0.2s;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        `;
        if (enabled) {
            btn.onmouseover = () => { btn.style.background = '#6a5a4a'; };
            btn.onmouseout = () => { btn.style.background = '#8a7a6a'; };
            btn.onclick = onClick;
        } else {
            btn.style.opacity = '0.5';
        }
        return btn;
    }

    // ─── LIVRE 3D ──────────────────────────────────────────────────
    function creerLivre3D() {
        const group = new THREE.Group();
        const couvMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.7, metalness: 0.1 });
        const couv = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 0.18), couvMat);
        couv.position.set(0, 0.015, 0);
        group.add(couv);
        const pageMat = new THREE.MeshStandardMaterial({ color: 0xFAF0E6, roughness: 0.9 });
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.17), pageMat);
        pages.position.set(0, 0, 0);
        group.add(pages);
        const dosMat = new THREE.MeshStandardMaterial({ color: 0x5C3A21 });
        const dos = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.01), dosMat);
        dos.position.set(0, 0.017, -0.09);
        group.add(dos);
        group.userData.estLivre = true;
        group.userData.couvMat = couvMat;
        group.userData.couleurOriginale = 0x8B0000;
        group.userData.couleurSurvol = 0xCC4444;
        return group;
    }

    let monLivre = null;

        function ajouterLivreSurBibliotheque() {
        if (monLivre) return;
        let bibliotheque = window._bibliotheque || null;
        let hauteurEtagere = 0.95;

        if (!bibliotheque) {
            // Si la référence globale n'existe pas, on cherche dans la scène
            scene.children.forEach((child) => {
                if (child.userData && Array.isArray(child.userData.etageres)) {
                    bibliotheque = child;
                    const etageres = child.userData.etageres;
                    if (etageres.length > 2) {
                        hauteurEtagere = etageres[2] + 0.02;
                    } else if (etageres.length > 0) {
                        hauteurEtagere = etageres[0] + 0.02;
                    }
                }
            });
        } else {
            // Si on a la bibliothèque via window._bibliotheque, on utilise ses étagères
            const etageres = bibliotheque.userData.etageres;
            if (etageres && etageres.length > 2) {
                hauteurEtagere = etageres[2] + 0.02;
            } else if (etageres && etageres.length > 0) {
                hauteurEtagere = etageres[0] + 0.02;
            }
        }

        if (!bibliotheque) {
            console.warn('📚 Bibliothèque non trouvée, le livre sera ajouté à la scène.');
        }

        const livre = creerLivre3D();
        monLivre = livre;
        livre.position.set(0.6, hauteurEtagere, 0.0);
        livre.rotation.y = 0;
        if (bibliotheque) {
            bibliotheque.add(livre);
        } else {
            scene.add(livre);
        }

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let livreSurvole = false;

        function onMouseMove(event) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([livre], true);
            if (intersects.length > 0) {
                if (!livreSurvole) {
                    livreSurvole = true;
                    livre.userData.couvMat.color.setHex(livre.userData.couleurSurvol);
                    canvas.style.cursor = 'pointer';
                }
            } else {
                if (livreSurvole) {
                    livreSurvole = false;
                    livre.userData.couvMat.color.setHex(livre.userData.couleurOriginale);
                    canvas.style.cursor = 'crosshair';
                }
            }
        }

        function onMouseClick(event) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([livre], true);
            if (intersects.length > 0) {
                ouvrirLivre();
                event.stopPropagation();
            }
        }

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onMouseClick);
        window._cleanupLivre = function() {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onMouseClick);
        };
    }

    function ouvrirLivre() {
        let modal = document.getElementById('modalLivre');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalLivre';
            modal.style.cssText = `
                position: fixed; top:50%; left:50%; transform:translate(-50%,-50%);
                width:70%; max-width:800px; height:80%;
                background: #f5f0eb; border-radius:12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5); padding:20px; z-index:1000;
                display:none; flex-direction:column; font-family: 'Georgia', serif;
            `;
            document.body.appendChild(modal);
        }
        modal.innerHTML = '';
        modal.style.display = 'flex';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute; top:10px; right:20px; font-size:28px;
            background:none; border:none; cursor:pointer; color:#333;
        `;
        closeBtn.onclick = () => { modal.style.display = 'none'; };
        modal.appendChild(closeBtn);
        const titre = document.createElement('h2');
        titre.textContent = '📖 Mon Livre';
        titre.style.marginTop = '0';
        modal.appendChild(titre);
        const contentDiv = document.createElement('div');
        contentDiv.id = 'contenuLivre';
        contentDiv.style.cssText = `
            flex:1; overflow-y:auto; margin-top:10px;
            display:flex; flex-direction:column; gap:15px;
        `;
        modal.appendChild(contentDiv);
        chargerContenuLivre(contentDiv);
    }

    setTimeout(ajouterLivreSurBibliotheque, 400);

    // ─── BIBLIOTHÈQUE ──────────────────────────────────────────────
    function createBookshelf() {
        const group = new THREE.Group();
        window._bibliotheque = group;
        const width = 2.0,
            height = 2.4,
            depth = 0.5;
        const shelfThick = 0.05,
            legThick = 0.06;
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xd4b090, roughness: 0.4, metalness: 0.1 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.8 });
        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a6e4b, roughness: 0.5, metalness: 0.1 });

        const legPositions = [
            [-width / 2 + 0.06, -depth / 2 + 0.06],
            [width / 2 - 0.06, -depth / 2 + 0.06],
            [-width / 2 + 0.06, depth / 2 - 0.06],
            [width / 2 - 0.06, depth / 2 - 0.06]
        ];
        legPositions.forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(legThick, height, legThick), metalMat);
            leg.position.set(x, height / 2, z);
            leg.castShadow = true;
            leg.receiveShadow = true;
            group.add(leg);
        });

        const nbShelves = 6;
        const spacing = height / (nbShelves + 1);
        const etageres = [];
        for (let i = 1; i <= nbShelves; i++) {
            const yPos = i * spacing - 0.05;
            etageres.push(yPos);
            const mat = (i % 2 === 0) ? woodMat : darkWoodMat;
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, shelfThick, depth - 0.04), mat);
            shelf.position.set(0, yPos, 0);
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            group.add(shelf);
        }

        const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.05, depth + 0.02), woodMat);
        top.position.set(0, height, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        const base = new THREE.Mesh(new THREE.BoxGeometry(width - 0.02, 0.04, depth - 0.02), metalMat);
        base.position.set(0, 0.02, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        group.userData.etageres = etageres;
        group.position.set(7.7, 0, -5);
        group.rotation.y = Math.PI / 2;
        scene.add(group);
    }
    createBookshelf();

    // ─── CADRES AVEC IMAGES ──────────────────────────────────────
    function generateFallbackTexture() {
        const canvas2 = document.createElement('canvas');
        canvas2.width = 256;
        canvas2.height = 256;
        const ctx = canvas2.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 256, 256);
        grad.addColorStop(0, '#8a7a5a');
        grad.addColorStop(1, '#5a4a2a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#d4a840';
        ctx.lineWidth = 12;
        ctx.strokeRect(20, 20, 216, 216);
        ctx.fillStyle = '#d4a840';
        ctx.font = '80px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎨', 128, 130);
        return new THREE.CanvasTexture(canvas2);
    }

    function makePictureFrame(z, facingRight, imageIndex) {
        const frameW = 0.8,
            frameH = 1.0,
            borderW = 0.02,
            depth = 0.12;
        const group = new THREE.Group();
        const wallX = facingRight ? ROOM_W / 2 - 0.02 : -ROOM_W / 2 + 0.02;
        const offsetX = facingRight ? -0.1 : 0.1;
        group.position.set(wallX + offsetX, 1.7, z);
        group.rotation.y = facingRight ? -Math.PI / 2 : Math.PI / 2;

        const imgMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const imageMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(frameW - borderW * 2.4, frameH - borderW * 2.4),
            imgMat
        );
        imageMesh.position.set(0, 0, depth * 0.2);
        group.add(imageMesh);

        const imgUrl = 'images/corridor' + imageIndex + '.png';
        const loader = new THREE.TextureLoader();
        loader.load(imgUrl, function(tex) {
            imageMesh.material = new THREE.MeshLambertMaterial({
                map: tex,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            imageMesh.material.needsUpdate = true;
        }, undefined, function() {
            const fallbacks = ['images/corridor' + imageIndex + '.jpg', 'images/corridor' + imageIndex + '.webp'];
            let tried = 0;

            function tryFallback() {
                if (tried >= fallbacks.length) {
                    imageMesh.material = new THREE.MeshLambertMaterial({
                        map: generateFallbackTexture(),
                        polygonOffset: true,
                        polygonOffsetFactor: -1,
                        polygonOffsetUnits: -1
                    });
                    return;
                }
                const fLoader = new THREE.TextureLoader();
                fLoader.load(fallbacks[tried], function(tex) {
                    imageMesh.material = new THREE.MeshLambertMaterial({
                        map: tex,
                        polygonOffset: true,
                        polygonOffsetFactor: -1,
                        polygonOffsetUnits: -1
                    });
                    imageMesh.material.needsUpdate = true;
                }, undefined, function() {
                    tried++;
                    tryFallback();
                });
            }
            tryFallback();
        });

        const bMat = new THREE.MeshLambertMaterial({ color: 0xb89040, emissive: 0x2a1a00, emissiveIntensity: 0.15 });
        const top = new THREE.Mesh(new THREE.BoxGeometry(frameW + 0.04, borderW, depth * 0.8), bMat);
        top.position.set(0, frameH / 2 - borderW / 2, 0);
        group.add(top);
        const bot = new THREE.Mesh(new THREE.BoxGeometry(frameW + 0.04, borderW, depth * 0.8), bMat);
        bot.position.set(0, -frameH / 2 + borderW / 2, 0);
        group.add(bot);
        const left = new THREE.Mesh(new THREE.BoxGeometry(borderW, frameH - borderW * 2, depth * 0.8), bMat);
        left.position.set(-frameW / 2 + borderW / 2, 0, 0);
        group.add(left);
        const right = new THREE.Mesh(new THREE.BoxGeometry(borderW, frameH - borderW * 2, depth * 0.8), bMat);
        right.position.set(frameW / 2 - borderW / 2, 0, 0);
        group.add(right);

        const dotMat = new THREE.MeshLambertMaterial({ color: 0xd4a840, emissive: 0x3a2600, emissiveIntensity: 0.2 });
        const corners = [
            [-frameW / 2 + borderW * 0.6, frameH / 2 - borderW * 0.6],
            [frameW / 2 - borderW * 0.6, frameH / 2 - borderW * 0.6],
            [-frameW / 2 + borderW * 0.6, -frameH / 2 + borderW * 0.6],
            [frameW / 2 - borderW * 0.6, -frameH / 2 + borderW * 0.6]
        ];
        corners.forEach(function(p) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), dotMat);
            dot.position.set(p[0], p[1], depth * 0.5);
            group.add(dot);
        });
        scene.add(group);
    }

    const framePositions = [
        { z: -5.5, facingRight: false, idx: 1 },
        { z: -3.5, facingRight: true, idx: 2 },
        { z: -1.5, facingRight: false, idx: 3 },
        { z: 1.5, facingRight: true, idx: 4 },
        { z: 3.5, facingRight: false, idx: 5 },
        { z: 5.5, facingRight: true, idx: 6 }
    ];
    framePositions.forEach(function(f) {
        makePictureFrame(f.z, f.facingRight, f.idx);
    });

    // ═══════════════════════════════════════════════════════════════
    //  TÉLÉVISION
    // ═══════════════════════════════════════════════════════════════
    function getVideoPath() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return '/projet/Illusion/videos/thethingsthatiwoulddo.mp4';
        } else {
            return 'videos/thethingsthatiwoulddo.mp4';
        }
    }

    function getImagePath(filename) {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return '/projet/Illusion/images/' + filename;
        } else {
            return 'images/' + filename;
        }
    }

    function createIconTexture(symbol) {
        const canvas2 = document.createElement('canvas');
        canvas2.width = 64;
        canvas2.height = 64;
        const ctx = canvas2.getContext('2d');
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 32, 34);
        return new THREE.CanvasTexture(canvas2);
    }

    const DEFAULT_VIDEOS = [
        "videos/here's a break midst all the angst shorts.mp4",
    ];

    let videoList = [];

    function getRandomVideoPath() {
        return new Promise((resolve) => {
            if (videoList.length > 0) {
                const idx = Math.floor(Math.random() * videoList.length);
                console.log('🔀 Vidéo choisie depuis videoList :', videoList[idx]);
                resolve(videoList[idx]);
                return;
            }

            const hostname = window.location.hostname;
            let jsonUrl = (hostname === 'localhost' || hostname === '127.0.0.1')
                ? '/projet/Illusion/videos.json'
                : 'videos.json';

            console.log('📡 Chargement de videos.json depuis :', jsonUrl);

            fetch(jsonUrl)
                .then(response => {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.json();
                })
                .then(data => {
                    videoList = data;
                    console.log('✅ JSON chargé, liste :', videoList);
                    const idx = Math.floor(Math.random() * videoList.length);
                    resolve(videoList[idx]);
                })
                .catch(err => {
                    console.warn('⚠️ Échec du JSON, utilisation de DEFAULT_VIDEOS :', err);
                    videoList = DEFAULT_VIDEOS.slice();
                    const idx = Math.floor(Math.random() * videoList.length);
                    resolve(videoList[idx]);
                });
        });
    }

    function createVintageTV() {
        const group = new THREE.Group();
        const shelfMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.0), shelfMat);
        shelf.position.set(0, 0.30, 0);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        group.add(shelf);

        const legMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const legPositions = [
            [-0.75, 0.15, -0.40],
            [0.75, 0.15, -0.40],
            [-0.75, 0.15, 0.40],
            [0.75, 0.15, 0.40]
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.30, 6), legMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.castShadow = true;
            group.add(leg);
        });

        const driveGroup = new THREE.Group();
        const driveMat = new THREE.MeshLambertMaterial({ color: 0xd4c8b0 });
        const driveBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), driveMat);
        driveBody.position.set(0, 0.40, 0);
        driveBody.castShadow = true;
        driveBody.receiveShadow = true;
        driveGroup.add(driveBody);
        const slotMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 0.02), slotMat);
        slot.position.set(0, 0.40, 0.18);
        driveGroup.add(slot);
        const ejectMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const ejectBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8), ejectMat);
        ejectBtn.rotation.x = Math.PI / 2;
        ejectBtn.position.set(0.12, 0.40, 0.16);
        driveGroup.add(ejectBtn);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const led = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), ledMat);
        led.position.set(-0.10, 0.40, 0.18);
        driveGroup.add(led);
        const stripeMat = new THREE.MeshLambertMaterial({ color: 0x887868 });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.01), stripeMat);
        stripe.position.set(0, 0.40, 0.175);
        driveGroup.add(stripe);
        driveGroup.position.set(0, 0.0, 0);
        group.add(driveGroup);

        const standMat = new THREE.MeshLambertMaterial({ color: 0x1a1008 });
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.10, 0.6), standMat);
        stand.position.set(0, 0.44, 0);
        stand.castShadow = true;
        stand.receiveShadow = true;
        group.add(stand);

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.7), bodyMat);
        body.position.set(0, 0.90, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const screenWidth = 1.05,
            screenHeight = 0.68;
        const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), blackMat);
        screen.position.set(0, 0.90, 0.39);
        group.add(screen);

        // ─── CRÉATION DE LA VIDÉO ──────────────────────────────────────
        const video = document.createElement('video');
        video.loop = false;
        video.muted = false;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.preload = "auto";

        // Historique
        let history = [];
        let historyIndex = -1;

        function loadVideoAndAddToHistory(videoPath) {
            const hostname = window.location.hostname;
            let fullPath = (hostname === 'localhost' || hostname === '127.0.0.1')
                ? '/projet/Illusion/' + videoPath
                : videoPath;

            if (historyIndex < history.length - 1) {
                history = history.slice(0, historyIndex + 1);
            }
            history.push(fullPath);
            historyIndex = history.length - 1;

            video.src = fullPath;
            video.load();
            if (window._isOn) {
                video.play().catch(() => {});
            }
            saveTVState();
        }

        function loadRandomVideo() {
            getRandomVideoPath()
                .then(videoPath => {
                    loadVideoAndAddToHistory(videoPath);
                })
                .catch(err => {
                    console.error('❌ Erreur fatale, fallback ultime', err);
                    loadVideoAndAddToHistory(DEFAULT_VIDEOS[0]);
                });
        }

        function nextVideo() {
            getRandomVideoPath()
                .then(videoPath => {
                    const hostname = window.location.hostname;
                    let fullPath = (hostname === 'localhost' || hostname === '127.0.0.1')
                        ? '/projet/Illusion/' + videoPath
                        : videoPath;
                    if (historyIndex < history.length - 1) {
                        history = history.slice(0, historyIndex + 1);
                    }
                    history.push(fullPath);
                    historyIndex = history.length - 1;
                    video.src = fullPath;
                    video.load();
                    if (window._isOn) {
                        video.play().catch(() => {});
                    }
                    saveTVState();
                });
        }

        function prevVideo() {
            if (historyIndex > 0) {
                historyIndex--;
                const fullPath = history[historyIndex];
                video.src = fullPath;
                video.load();
                if (window._isOn) {
                    video.play().catch(() => {});
                }
                saveTVState();
            }
        }

        loadRandomVideo();

        video.addEventListener('ended', function() {
            loadRandomVideo();
        });

        let storedState = null;
        try {
            const raw = sessionStorage.getItem('tvState');
            if (raw) storedState = JSON.parse(raw);
        } catch (e) {}
        let isOn = true;
        let previousVolume = storedState ? storedState.volume : 0.6;
        let videoMaterial = null;
        let videoStarted = false;

        function saveTVState() {
            try {
                sessionStorage.setItem('tvState', JSON.stringify({
                    isOn: isOn,
                    volume: video.volume || 0.6
                }));
            } catch (e) {}
        }

        function startVideo() {
            if (!videoStarted) {
                video.play().then(() => {
                    videoStarted = true;
                    if (!isOn) { video.pause();
                        video.volume = 0; }
                    saveTVState();
                }).catch(() => {
                    document.addEventListener('click', startVideo, { once: true });
                });
            }
        }
        document.addEventListener('click', startVideo, { once: true });

        video.addEventListener('canplaythrough', function() {
            if (!videoStarted) startVideo();
            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            window._videoTexture = videoTexture;
            videoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide });
            if (isOn) {
                screen.material = videoMaterial;
            } else {
                screen.material = blackMat;
                video.pause();
                video.volume = 0;
            }
            screen.material.needsUpdate = true;
            saveTVState();
        });

        video.addEventListener('error', function(e) {
            console.error('❌ Erreur vidéo :', video.src, e);
        });

        const frameMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.04), frameMat);
        frame.position.set(0, 0.90, 0.35);
        group.add(frame);

        const knobMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4 });
       // Dans createVintageTV, remplace la boucle :
const knobConfigs = [
    { x: -0.4, symbol: '⏻', action: 'power' },
    { x: 0, symbol: '+', action: 'next' },
    { x: 0.4, symbol: '−', action: 'prev' }
];
const knobMeshes = [];
knobConfigs.forEach((cfg) => {
    // CRÉER UN MATÉRIAU PROPRE À CE BOUTON (clone)
    const mat = knobMat.clone();
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.10, 8), mat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(cfg.x, 0.47, 0.42);
    knob.castShadow = true;
    group.add(knob);
    knobMeshes.push(knob);
    knob.userData.action = cfg.action;
    // icône...
    const iconTex = createIconTexture(cfg.symbol);
    const iconMat = new THREE.MeshBasicMaterial({
        map: iconTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false
    });
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.10), iconMat);
    icon.position.set(cfg.x, 0.47, 0.48);
    group.add(icon);
});
        const antMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
        const start1 = new THREE.Vector3(-0.30, 1.35, 0.1);
        const end1 = new THREE.Vector3(-0.40, 2.05, 0.15);
        const mid1 = new THREE.Vector3().addVectors(start1, end1).multiplyScalar(0.5);
        const dir1 = new THREE.Vector3().subVectors(end1, start1);
        const len1 = dir1.length();
        dir1.normalize();
        const ant1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len1, 4), antMat);
        ant1.position.copy(mid1);
        ant1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir1);
        group.add(ant1);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
        const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ballMat);
        ball1.position.copy(end1);
        group.add(ball1);
        const start2 = new THREE.Vector3(0.30, 1.35, 0.1);
        const end2 = new THREE.Vector3(0.40, 2.05, 0.15);
        const mid2 = new THREE.Vector3().addVectors(start2, end2).multiplyScalar(0.5);
        const dir2 = new THREE.Vector3().subVectors(end2, start2);
        const len2 = dir2.length();
        dir2.normalize();
        const ant2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len2, 4), antMat);
        ant2.position.copy(mid2);
        ant2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
        group.add(ant2);
        const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ballMat);
        ball2.position.copy(end2);
        group.add(ball2);

        group.position.set(-7, 0.0, 7.2);
        group.rotation.y = +Math.PI / 1.2;
        scene.add(group);

        window._knobMeshes = knobMeshes;
        window._screen = screen;
        window._video = video;
        window._blackMat = blackMat;
        window._videoMaterial = videoMaterial;
        window._isOn = isOn;

        // Surbrillance subtile
        function highlightKnob(knob) {
            if (knob) {
                knob.material.color.setHex(0xcccccc);
                knob.material.emissive = new THREE.Color(0xffffaa);
                knob.material.emissiveIntensity = 0.2;
            }
        }

        function unhighlightKnob(knob) {
            if (knob) {
                knob.material.color.setHex(0x888888);
                knob.material.emissive = new THREE.Color(0x000000);
                knob.material.emissiveIntensity = 0;
            }
        }

        function animateKnobPress(knob, callback) {
            const originalY = knob.position.y;
            const targetY = originalY - 0.02;
            const duration = 150;
            const startTime = performance.now();

            function press(time) {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const currentY = originalY + (targetY - originalY) * eased;
                knob.position.y = currentY;
                if (progress < 1) {
                    requestAnimationFrame(press);
                } else {
                    const upStart = performance.now();
                    function up(time2) {
                        const elapsed2 = time2 - upStart;
                        const progress2 = Math.min(elapsed2 / duration, 1);
                        const eased2 = 1 - Math.pow(1 - progress2, 3);
                        const currentY2 = targetY + (originalY - targetY) * eased2;
                        knob.position.y = currentY2;
                        if (progress2 < 1) {
                            requestAnimationFrame(up);
                        } else {
                            knob.position.y = originalY;
                            if (callback) callback();
                        }
                    }
                    requestAnimationFrame(up);
                }
            }
            requestAnimationFrame(press);
        }

        window._highlightKnob = highlightKnob;
        window._unhighlightKnob = unhighlightKnob;
        window._animateKnobPress = animateKnobPress;
        window._nextVideo = nextVideo;
        window._prevVideo = prevVideo;

        console.log('📺 Télévision ajoutée.');
    }

    // ─── CARTON AVEC DEUX RABATS ────────────────────────────────────
    function createCardboardBox() {
        const group = new THREE.Group();
        const boxW = 1.2,
            boxH = 0.7,
            boxD = 0.9;
        const thick = 0.025;

        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#b8956a';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * 256,
                y = Math.random() * 256;
            const v = 120 + Math.random() * 70;
            ctx.fillStyle = 'rgb(' + v + ',' + (v - 15) + ',' + (v - 30) + ')';
            ctx.fillRect(x, y, 3 + Math.random() * 8, 2 + Math.random() * 6);
        }
        ctx.strokeStyle = 'rgba(70,40,10,0.12)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 25; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 11 + 3);
            for (let x = 0; x < 256; x += 4) {
                ctx.lineTo(x, i * 11 + 3 + Math.sin(x / 18) * 5);
            }
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(60,35,15,0.2)';
        ctx.fillRect(0, 0, 20, 20);
        ctx.fillRect(236, 0, 20, 20);
        ctx.fillRect(0, 236, 20, 20);
        ctx.fillRect(236, 236, 20, 20);
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);

        const extMat = new THREE.MeshStandardMaterial({ map: tex, color: 0xccaa88, roughness: 0.85 });
        const intMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.9, side: THREE.DoubleSide });
        const hiMat = new THREE.MeshStandardMaterial({ map: tex, color: 0xddbb99, emissive: 0x553322, emissiveIntensity: 0.2 });

        // Fond
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(boxW, thick, boxD), extMat);
        bottom.position.set(0, -boxH / 2, 0);
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        group.add(bottom);

        // Parois
        const back = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, thick), extMat);
        back.position.set(0, 0, -boxD / 2);
        back.castShadow = true;
        back.receiveShadow = true;
        group.add(back);
        const front = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, thick), extMat);
        front.position.set(0, 0, boxD / 2);
        front.castShadow = true;
        front.receiveShadow = true;
        group.add(front);
        const left = new THREE.Mesh(new THREE.BoxGeometry(thick, boxH, boxD), extMat);
        left.position.set(-boxW / 2, 0, 0);
        left.castShadow = true;
        left.receiveShadow = true;
        group.add(left);
        const right = new THREE.Mesh(new THREE.BoxGeometry(thick, boxH, boxD), extMat);
        right.position.set(boxW / 2, 0, 0);
        right.castShadow = true;
        right.receiveShadow = true;
        group.add(right);

        // Intérieur
        const intBack = new THREE.Mesh(new THREE.PlaneGeometry(boxW - thick * 2, boxH - thick * 2), intMat);
        intBack.position.set(0, 0, -boxD / 2 + thick + 0.001);
        group.add(intBack);
        const intFront = new THREE.Mesh(new THREE.PlaneGeometry(boxW - thick * 2, boxH - thick * 2), intMat);
        intFront.position.set(0, 0, boxD / 2 - thick - 0.001);
        intFront.rotation.y = Math.PI;
        group.add(intFront);
        const intLeft = new THREE.Mesh(new THREE.PlaneGeometry(boxD - thick * 2, boxH - thick * 2), intMat);
        intLeft.position.set(-boxW / 2 + thick + 0.001, 0, 0);
        intLeft.rotation.y = -Math.PI / 2;
        group.add(intLeft);
        const intRight = new THREE.Mesh(new THREE.PlaneGeometry(boxD - thick * 2, boxH - thick * 2), intMat);
        intRight.position.set(boxW / 2 - thick - 0.001, 0, 0);
        intRight.rotation.y = Math.PI / 2;
        group.add(intRight);

        // Rabat avant
        const pivotFront = new THREE.Group();
        pivotFront.position.set(0, boxH / 2, boxD / 2);
        group.add(pivotFront);
        const flapFront = new THREE.Mesh(new THREE.BoxGeometry(boxW, thick, boxD / 2), extMat);
        flapFront.position.set(0, 0, -boxD / 4);
        flapFront.castShadow = true;
        flapFront.receiveShadow = true;
        pivotFront.add(flapFront);
        const intFlapFront = new THREE.Mesh(new THREE.PlaneGeometry(boxW - thick * 2, boxD / 2 - thick * 2), intMat);
        intFlapFront.position.set(0, -thick / 2 - 0.001, -boxD / 4);
        intFlapFront.rotation.x = -Math.PI / 2;
        pivotFront.add(intFlapFront);

        // Rabat arrière avec image
        const pivotBack = new THREE.Group();
        pivotBack.position.set(0, boxH / 2, -boxD / 2);
        group.add(pivotBack);
        const flapBack = new THREE.Mesh(new THREE.BoxGeometry(boxW, thick, boxD / 2), extMat);
        flapBack.position.set(0, 0, boxD / 4);
        flapBack.castShadow = true;
        flapBack.receiveShadow = true;
        pivotBack.add(flapBack);
        const intFlapBack = new THREE.Mesh(new THREE.PlaneGeometry(boxW - thick * 2, boxD / 2 - thick * 2), intMat);
        intFlapBack.position.set(0, -thick / 2 - 0.001, boxD / 4);
        intFlapBack.rotation.x = -Math.PI / 2;
        pivotBack.add(intFlapBack);

        // Image posée sur le rabat
        const imageUrl = getImagePath('cartonnote.png');
        const textureLoader = new THREE.TextureLoader();
        const noteTexture = textureLoader.load(imageUrl);
        noteTexture.wrapS = THREE.ClampToEdgeWrapping;
        noteTexture.wrapT = THREE.ClampToEdgeWrapping;
        noteTexture.repeat.set(1, 1);

        const imageMat = new THREE.MeshStandardMaterial({
            map: noteTexture,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.7,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });

        const imagePlane = new THREE.Mesh(
            new THREE.PlaneGeometry(boxW * 0.7, (boxD / 2) * 0.7),
            imageMat
        );
        imagePlane.position.set(0, thick / 2 + 0.005, boxD / 4);
        imagePlane.rotation.x = -Math.PI / 2;
        imagePlane.frustumCulled = false;
        imagePlane.rotation.y = 0;
        pivotBack.add(imagePlane);

        window._cartonRabats = [{
            pivot: pivotFront,
            mesh: flapFront,
            open: false,
            targetAngle: 0,
            animating: false,
            originalMat: extMat,
            hiMat: new THREE.MeshStandardMaterial({ map: extMat.map, color: 0xddbb99, emissive: 0x553322, emissiveIntensity: 0.2 })
        }, {
            pivot: pivotBack,
            mesh: flapBack,
            open: false,
            targetAngle: 0,
            animating: false,
            originalMat: extMat,
            hiMat: new THREE.MeshStandardMaterial({ map: extMat.map, color: 0xddbb99, emissive: 0x553322, emissiveIntensity: 0.2 })
        }];
        window._cartonMaterials = { woodMat: extMat, woodHiMat: hiMat };

        group.position.set(-5, 0.35, 7);
        group.userData.isCarton = true;
        group.rotation.y = 0.0;
        scene.add(group);

        window._cartonCollision = {
            group: group,
            halfW: boxW / 2,
            halfH: boxH / 2,
            halfD: boxD / 2,
            center: group.position.clone()
        };

        console.log('📦 Carton avec image');
        return group;
    }

    // ─── LECTEUR DE DISQUETTES ────────────────────────────────────────
    function createDiskDrive() {
        const group = new THREE.Group();
        const driveW = 0.5,
            driveH = 0.25,
            driveD = 0.4;

        const posX = -6.88;
        const posY = 1.35;
        const posZ = 5.29;

        const metalMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.7, roughness: 0.3 });
        const plasticMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.5 });
        const buttonMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, emissive: 0x440000, emissiveIntensity: 0.2 });
        const slotMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(driveW, driveH, driveD), metalMat);
        body.position.set(0, driveH / 2, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const face = new THREE.Mesh(new THREE.PlaneGeometry(driveW * 0.9, driveH * 0.8), plasticMat);
        face.position.set(0, driveH / 2, driveD / 2 + 0.001);
        group.add(face);

        const slot = new THREE.Mesh(new THREE.PlaneGeometry(driveW * 0.5, 0.04), slotMat);
        slot.position.set(0, driveH / 2 + 0.02, driveD / 2 + 0.002);
        group.add(slot);

        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 8), buttonMat);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(0.16, driveH / 2 - 0.04, driveD / 2 + 0.015);
        btn.userData.isDriveButton = true;
        group.add(btn);

        const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), ledMat);
        led.position.set(-0.16, driveH / 2 - 0.04, driveD / 2 + 0.015);
        group.add(led);

        const trayGroup = new THREE.Group();
        trayGroup.position.set(0, driveH / 2 - 0.01, driveD / 2);
        group.add(trayGroup);

        const trayMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.6 });
        const tray = new THREE.Mesh(new THREE.BoxGeometry(driveW * 0.6, 0.02, 0.12), trayMat);
        tray.position.set(0, 0, 0);
        tray.castShadow = true;
        trayGroup.add(tray);

        const recess = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0x222233 }));
        recess.position.set(0, 0.002, 0.01);
        trayGroup.add(recess);

        group.position.set(posX, posY, posZ);
        group.rotation.y = Math.PI / 2;
        scene.add(group);

        window._diskDrive = {
            group: group,
            tray: trayGroup,
            trayOpen: false,
            trayAnimating: false,
            button: btn,
            insertedDisk: null,
            diskName: null,
            trayWorldPos: new THREE.Vector3(posX - 0.3, posY + 0.15, posZ)
        };

        // Câble
        const start = new THREE.Vector3(posX - 0.35, posY + 0.05, posZ);
        const end = new THREE.Vector3(-7.0, 0.2, 7.6);
        const mid = new THREE.Vector3((start.x + end.x) / 2, 0.02, (start.z + end.z) / 2 + 0.3);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const tubeGeo = new THREE.TubeGeometry(curve, 30, 0.025, 8, false);
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        const cable = new THREE.Mesh(tubeGeo, cableMat);
        cable.castShadow = true;
        scene.add(cable);

        console.log('💾 Lecteur de disquettes vintage (rehaussé)');
        return group;
    }

    // ─── MEUBLE À TIROIR ──────────────────────────────────────────────
    function createPedestalDrawer(config) {
        const {
            posX = -6.88,
            posY = 0.0,
            posZ = 5.29,
            width = 0.70,
            depth = 0.60,
            height = 0.65,
            legHeight = 0.50,
            drawerHeight = 0.22,
            color = 0x8a7a5a,
            legColor = 0x555555,
            handleColor = 0xccaa88,
            openDistance = 0.28,
        } = config || {};

        const group = new THREE.Group();
        group.position.set(posX, posY, posZ);

        // Pieds
        const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.3, metalness: 0.2 });
        const legPositions = [
            [-width/2 + 0.06, -depth/2 + 0.06],
            [ width/2 - 0.06, -depth/2 + 0.06],
            [-width/2 + 0.06,  depth/2 - 0.06],
            [ width/2 - 0.06,  depth/2 - 0.06]
        ];
        legPositions.forEach(([x, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, legHeight, 8), legMat);
            leg.position.set(x, legHeight/2, z);
            leg.castShadow = true;
            group.add(leg);
        });

        // Socle
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.7 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.04, depth + 0.02), baseMat);
        base.position.set(0, legHeight, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Corps fixe
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
        const bodyHeight = height - legHeight - drawerHeight - 0.04;
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, depth), bodyMat);
        body.position.set(0, legHeight + 0.04 + bodyHeight/2, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Tiroir mobile
        const drawerGroup = new THREE.Group();
        drawerGroup.position.set(0, legHeight + 0.04 + bodyHeight/2, 0);
        group.add(drawerGroup);

        const innerW = width * 0.74;
        const innerH = drawerHeight * 0.74;
        const innerD = depth * 0.45;
        const innerMat = new THREE.MeshStandardMaterial({ color: 0xab8b6a, roughness: 0.8 });

        const bottom = new THREE.Mesh(new THREE.BoxGeometry(innerW, 0.015, innerD), innerMat);
        bottom.position.set(0, -innerH/2, -0.02);
        bottom.castShadow = true;
        drawerGroup.add(bottom);
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.015, innerH, innerD), innerMat);
        leftWall.position.set(-innerW/2, 0, -0.02);
        leftWall.castShadow = true;
        drawerGroup.add(leftWall);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.015, innerH, innerD), innerMat);
        rightWall.position.set(innerW/2, 0, -0.02);
        rightWall.castShadow = true;
        drawerGroup.add(rightWall);
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(innerW, innerH, 0.015), innerMat);
        backWall.position.set(0, 0, -innerD - 0.02);
        backWall.castShadow = true;
        drawerGroup.add(backWall);

        // Façade avant
        const frontMat = new THREE.MeshStandardMaterial({ color: 0xb89a7a, roughness: 0.5 });
        const frontPanel = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.84, drawerHeight * 0.87, 0.025),
            frontMat
        );
        frontPanel.position.set(0, 0, depth/2 + 0.005);
        frontPanel.castShadow = true;
        frontPanel.receiveShadow = true;
        drawerGroup.add(frontPanel);

        // Poignée
        const handleMat = new THREE.MeshStandardMaterial({ color: handleColor, metalness: 0.6, roughness: 0.3 });
        const hBaseL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6), handleMat);
        hBaseL.rotation.x = Math.PI / 2;
        hBaseL.position.set(-0.12, 0.04, depth/2 + 0.04);
        drawerGroup.add(hBaseL);
        const hBaseR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6), handleMat);
        hBaseR.rotation.x = Math.PI / 2;
        hBaseR.position.set(0.12, 0.04, depth/2 + 0.04);
        drawerGroup.add(hBaseR);
        const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 8), handleMat);
        handleBar.rotation.z = Math.PI / 2;
        handleBar.position.set(0, 0.04, depth/2 + 0.04);
        drawerGroup.add(handleBar);

        // Zone cliquable
        const clickArea = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 0.80, drawerHeight * 0.85),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
        );
        clickArea.position.set(0, 0, depth/2 + 0.03);
        drawerGroup.add(clickArea);

        const drawerState = {
            group: drawerGroup,
            isOpen: false,
            isAnimating: false,
            targetZ: 0,
            openDistance: openDistance,
            frontPanel: frontPanel,
            frontMat: frontMat,
            hoverMat: new THREE.MeshStandardMaterial({ color: 0xd4b89a, roughness: 0.3 }),
            handleMat: handleMat,
            clickArea: clickArea,
            originalHandleColor: handleColor,
        };

        if (!window._pedestalDrawers) window._pedestalDrawers = [];
        window._pedestalDrawers.push(drawerState);

        scene.add(group);
        console.log('🪑 Meuble à tiroir unique (pieds longs) créé');
        return drawerState;
    }

    // ─── LAMPES MODERNES (centrées sur chaque moitié) ───────────────────

const lampConfigs = [
    {
        id: 'left',
        position: new THREE.Vector3(0, 2.8, -4),
        color: 0xffeedd,
        intensity: 2.0,
        range: 12,
        switchPos: new THREE.Vector3(-7.85, 1.0, -4),
        switchAngle: Math.PI / 2
    },
    {
        id: 'right',
        position: new THREE.Vector3(0, 2.8, 4),
        color: 0xffeedd,
        intensity: 2.0,
        range: 12,
        switchPos: new THREE.Vector3(7.85, 1.0, 4),
        switchAngle: -Math.PI / 2
    }
];

const lampStates = {};
const lampMeshes = {};
const switchMeshes = [];

lampConfigs.forEach((cfg) => {
    const group = new THREE.Group();
    group.position.copy(cfg.position);

    // Ampoule
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.8, roughness: 0.2 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 8), headMat);
    head.position.y = 0;
    head.rotation.x = Math.PI;
    group.add(head);

    const bulbMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), bulbMat);
    bulb.position.y = -0.15;
    group.add(bulb);

    // Lumière (puissante)
    const light = new THREE.PointLight(cfg.color, cfg.intensity, cfg.range);
    light.position.copy(cfg.position);
    light.position.y -= 0.15;
    scene.add(light);

    // Câble
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), cableMat);
    cable.position.y = 0.4;
    group.add(cable);

    scene.add(group);

    lampStates[cfg.id] = true;
    lampMeshes[cfg.id] = { group, bulb, light, bulbMat };

    // Interrupteur
    const switchGroup = new THREE.Group();
    switchGroup.position.copy(cfg.switchPos);

    const plateMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.2 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.04), plateMat);
    plate.position.set(0, 0, 0);
    switchGroup.add(plate);

    const btnMat = new THREE.MeshStandardMaterial({
        color: 0x44aa44,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.4
    });
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), btnMat);
    btn.position.set(0, 0, 0.03);
    btn.userData.isSwitch = true;
    btn.userData.lampId = cfg.id;
    btn.userData.defaultColor = 0x44aa44;
    btn.userData.hoverColor = 0x88ff88;
    switchGroup.add(btn);

    switchGroup.rotation.y = cfg.switchAngle;
    scene.add(switchGroup);

    switchMeshes.push(btn);
});

function setupSwitchInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredSwitch = null;

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(switchMeshes);
        let newHover = null;
        if (intersects.length > 0) {
            newHover = intersects[0].object;
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }

        if (newHover !== hoveredSwitch) {
            if (hoveredSwitch) {
                hoveredSwitch.material.color.setHex(hoveredSwitch.userData.defaultColor);
                hoveredSwitch.material.emissive.setHex(0x000000);
                hoveredSwitch.material.emissiveIntensity = 0;
            }
            if (newHover) {
                newHover.material.color.setHex(newHover.userData.hoverColor);
                newHover.material.emissive.setHex(0xffff88);
                newHover.material.emissiveIntensity = 0.3;
            }
            hoveredSwitch = newHover;
        }
    });

    canvas.addEventListener('click', (event) => {
        if (!hoveredSwitch) return;
        const lampId = hoveredSwitch.userData.lampId;
        const state = lampStates[lampId];
        lampStates[lampId] = !state;
        const data = lampMeshes[lampId];
        data.light.intensity = lampStates[lampId] ? data.light.intensity : 0;
        const newColor = lampStates[lampId] ? data.light.color : 0x444444;
        data.bulbMat.color.setHex(newColor);
        data.bulbMat.emissive.setHex(newColor);
        data.bulbMat.emissiveIntensity = lampStates[lampId] ? 0.8 : 0;
        const btn = hoveredSwitch;
        btn.userData.defaultColor = lampStates[lampId] ? 0x44aa44 : 0xaa4444;
        btn.material.color.setHex(btn.userData.defaultColor);
    });
}

setupSwitchInteractions();
    // ─── CRÉATION DES OBJETS ──────────────────────────────────────
    createVintageTV();
    createCardboardBox();
    createDiskDrive();
    createPedestalDrawer({
        posX: -6.88,
        posY: 0.0,
        posZ: 5.29,
        width: 0.70,
        depth: 0.60,
        height: 0.65,
        legHeight: 0.50,
        drawerHeight: 0.22,
        color: 0x7a6a5a,
        legColor: 0x555555,
        handleColor: 0xccaa88,
        openDistance: 0.28,
    });

    // ─── GRAND TABLEAU VERT ──────────────────────────────────────────
    (function createGreenBoard() {
        const group = new THREE.Group();
        const boardW = 2.8;
        const boardH = 2.0;
        const depth = 0.06;
        const posX = 4.16;
        const posY = 1.70;
        const posZ = -7.20;

        const greenMat = new THREE.MeshStandardMaterial({ color: 0x2a6b2a, roughness: 0.7, metalness: 0.05 });
        const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, depth), greenMat);
        boardMesh.position.set(0, 0, 0);
        boardMesh.castShadow = true;
        boardMesh.receiveShadow = true;
        group.add(boardMesh);

        // Texture craie
        const chalkCanvas = document.createElement('canvas');
        chalkCanvas.width = 256;
        chalkCanvas.height = 256;
        const ctx2 = chalkCanvas.getContext('2d');
        ctx2.fillStyle = '#2a6b2a';
        ctx2.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 800; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const v = 60 + Math.random() * 40;
            ctx2.fillStyle = 'rgba(' + v + ',' + (v + 30) + ',' + v + ',0.08)';
            ctx2.fillRect(x, y, 2 + Math.random() * 4, 1 + Math.random() * 3);
        }
        const chalkTex = new THREE.CanvasTexture(chalkCanvas);
        chalkTex.wrapS = chalkTex.wrapT = THREE.ClampToEdgeWrapping;

        const textureMat = new THREE.MeshStandardMaterial({
            map: chalkTex,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            roughness: 0.9
        });
        const texturePlane = new THREE.Mesh(
            new THREE.PlaneGeometry(boardW - 0.1, boardH - 0.1),
            textureMat
        );
        texturePlane.position.set(0, 0, depth / 2 + 0.001);
        group.add(texturePlane);

        // Image "enquete.PNG"
        const imageUrl = getImagePath('enquete.PNG');
        const loader = new THREE.TextureLoader();
        const imgMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            roughness: 0.3,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const imgPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(boardW * 0.82, boardH * 0.82),
            imgMat
        );
        imgPlane.position.set(0, 0, depth / 2 + 0.003);
        imgPlane.castShadow = false;
        imgPlane.receiveShadow = false;
        group.add(imgPlane);

        loader.load(imageUrl, function(tex) {
            const aspect = tex.image.width / tex.image.height;
            const planeAspect = (boardW * 0.82) / (boardH * 0.82);
            let scaleW = 1,
                scaleH = 1;
            if (aspect > planeAspect) {
                scaleH = planeAspect / aspect;
            } else {
                scaleW = aspect / planeAspect;
            }
            imgPlane.scale.set(scaleW, scaleH, 1);
            imgPlane.material = new THREE.MeshStandardMaterial({
                map: tex,
                side: THREE.DoubleSide,
                roughness: 0.3,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            imgPlane.material.needsUpdate = true;
        }, undefined, function() {
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 512;
            fallbackCanvas.height = 384;
            const fctx = fallbackCanvas.getContext('2d');
            fctx.fillStyle = '#1a3a1a';
            fctx.fillRect(0, 0, 512, 384);
            fctx.fillStyle = '#d4b870';
            fctx.font = 'bold 42px Georgia, serif';
            fctx.textAlign = 'center';
            fctx.textBaseline = 'middle';
            fctx.fillText('📄 enquete.PNG', 256, 180);
            fctx.font = '24px Georgia, serif';
            fctx.fillStyle = '#a08050';
            fctx.fillText('image non trouvée', 256, 250);
            const fallbackTex = new THREE.CanvasTexture(fallbackCanvas);
            imgPlane.material = new THREE.MeshStandardMaterial({
                map: fallbackTex,
                side: THREE.DoubleSide,
                roughness: 0.4,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            imgPlane.material.needsUpdate = true;
            console.warn('⚠️ Image enquete.PNG non chargée, fallback affiché.');
        });

        // Cadre
        const frameMat2 = new THREE.MeshStandardMaterial({ color: 0x6a4e2e, roughness: 0.7, metalness: 0.1 });
        const frameW = 0.07;
        const topFrame2 = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.06, frameW, 0.12), frameMat2);
        topFrame2.position.set(0, boardH / 2 + frameW / 2, 0);
        topFrame2.castShadow = true;
        group.add(topFrame2);
        const botFrame2 = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.06, frameW, 0.12), frameMat2);
        botFrame2.position.set(0, -boardH / 2 - frameW / 2, 0);
        botFrame2.castShadow = true;
        group.add(botFrame2);
        const leftFrame2 = new THREE.Mesh(new THREE.BoxGeometry(frameW, boardH + 0.06, 0.12), frameMat2);
        leftFrame2.position.set(-boardW / 2 - frameW / 2, 0, 0);
        leftFrame2.castShadow = true;
        group.add(leftFrame2);
        const rightFrame2 = new THREE.Mesh(new THREE.BoxGeometry(frameW, boardH + 0.06, 0.12), frameMat2);
        rightFrame2.position.set(boardW / 2 + frameW / 2, 0, 0);
        rightFrame2.castShadow = true;
        group.add(rightFrame2);

        const cornerMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.5, metalness: 0.2 });
        const cornerPositions = [
            [-boardW / 2 + 0.08, boardH / 2 - 0.08],
            [boardW / 2 - 0.08, boardH / 2 - 0.08],
            [-boardW / 2 + 0.08, -boardH / 2 + 0.08],
            [boardW / 2 - 0.08, -boardH / 2 + 0.08]
        ];
        cornerPositions.forEach(([cx, cy]) => {
            const corner = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), cornerMat);
            corner.position.set(cx, cy, 0.07);
            group.add(corner);
        });

        group.position.set(posX, posY, posZ);
        group.rotation.y = 0;
        scene.add(group);
        console.log('🟩 Tableau vert avec enquete.PNG ajouté');
    })();

    // ─── DISQUETTES ──────────────────────────────────────────────────
    function createFloppyDisk3D(color, name, file) {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
        const labelMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), bodyMat);
        body.position.set(0, 0, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.08), labelMat);
        label.position.set(0, 0.003, 0.081);
        group.add(label);

        const slider = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.035), metalMat);
        slider.position.set(-0.04, 0.003, 0.081);
        group.add(slider);

        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), new THREE.MeshBasicMaterial({ color: 0x222222 }));
        hole.position.set(0.05, 0.003, 0.081);
        group.add(hole);

        group.userData.diskName = name;
        group.userData.videoFile = file;
        return group;
    }
    function createFloppyDisks() {
    // Supprime l'ancien groupe s'il existe
    if (window._diskGroup) {
        scene.remove(window._diskGroup);
        window._diskGroup = null;
    }

    const diskGroup = new THREE.Group();
    // Positionne les disquettes à 2 mètres devant la caméra (mais en monde absolu)
    // Comme la caméra est à (200, 1.7, 0) orientée vers +Z, on les met à (200, 1.7, 4)
    diskGroup.position.set(200, 1.7, 4);
    diskGroup.rotation.y = 0;

    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffaa00];
    const names = ['Rouge', 'Vert', 'Bleu', 'Jaune'];

    for (let i = 0; i < 4; i++) {
        // Boîte plate comme une disquette, mais grande (0.5 x 0.1 x 0.5)
        const geo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
        const mat = new THREE.MeshStandardMaterial({
            color: colors[i],
            emissive: colors[i],
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.1
        });
        const disk = new THREE.Mesh(geo, mat);
        // Position relative dans le groupe
        const x = (i % 2) * 0.6 - 0.3;
        const z = Math.floor(i / 2) * 0.6 - 0.3;
        disk.position.set(x, 0, z);
        disk.rotation.y = i * 0.5;
        disk.userData.diskName = names[i];
        disk.userData.isDisk = true;
        diskGroup.add(disk);
    }

    scene.add(diskGroup);
    window._diskGroup = diskGroup;
    window._disks = diskGroup.children;
    console.log('💾 Disquettes placées à (200, 1.7, 4) !');
}

// La fonction fallback appelle simplement la même chose
function createFallbackDisks() {
    createFloppyDisks();
}
function createFloppyDisks() {
    if (window._diskGroup) {
        scene.remove(window._diskGroup);
        window._diskGroup = null;
    }

    const diskGroup = new THREE.Group();
    // Position absolue : juste devant la caméra (qui est à (200, 1.7, 0))
    diskGroup.position.set(201.46, 1.5, 4.95);
    diskGroup.rotation.y = 0;

    // Créer une grosse boîte jaune fluo
    const geo = new THREE.BoxGeometry(2, 0.5, 2);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 1,
        roughness: 0,
        metalness: 0
    });
    const disk = new THREE.Mesh(geo, mat);
    disk.userData.diskName = 'TEST';
    disk.userData.isDisk = true;
    diskGroup.add(disk);

    // Ajouter une deuxième boîte à côté
    const disk2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.5, 1),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1 })
    );
    disk2.position.set(2, 0, 0);
    disk2.userData.isDisk = true;
    diskGroup.add(disk2);

    scene.add(diskGroup);
    window._diskGroup = diskGroup;
    window._disks = diskGroup.children;
    console.log('💾 GROSSES DISQUETTES placées à (200, 1.7, 5) !');
}

function createFallbackDisks() {
    createFloppyDisks();
}
    // ─── INTERACTIONS ──────────────────────────────────────────────────
    // Télévision
    function setupTVInteractions() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredKnob = null;

        canvas.addEventListener('mousemove', function(event) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const knobMeshes = window._knobMeshes || [];
            const intersects = raycaster.intersectObjects(knobMeshes, false);
            let newHover = null;
            if (intersects.length > 0) {
                newHover = intersects[0].object;
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'default';
            }

            if (newHover !== hoveredKnob) {
                if (hoveredKnob) {
                    window._unhighlightKnob(hoveredKnob);
                }
                hoveredKnob = newHover;
                if (hoveredKnob) {
                    window._highlightKnob(hoveredKnob);
                }
            }
        });

        canvas.addEventListener('click', function(event) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const knobMeshes = window._knobMeshes || [];
            const intersects = raycaster.intersectObjects(knobMeshes, false);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                const action = obj.userData.action;
                if (action) {
                    window._animateKnobPress(obj, function() {
                        handleKnobAction(action);
                    });
                }
            }
        });

        function handleKnobAction(action) {
            const video = window._video;
            const screen = window._screen;
            const blackMat = window._blackMat;
            const videoMaterial = window._videoMaterial;
            let isOn = window._isOn;

            switch (action) {
                case 'power':
                    if (isOn) {
                        window._previousVolume = video.volume || 0.6;
                        video.pause();
                        video.volume = 0;
                        screen.material = blackMat;
                        window._isOn = false;
                    } else {
                        video.play().catch(() => {});
                        video.volume = window._previousVolume > 0 ? window._previousVolume : 0.6;
                        if (videoMaterial) {
                            screen.material = videoMaterial;
                        } else {
                            const fallbackTex = new THREE.VideoTexture(video);
                            fallbackTex.minFilter = THREE.LinearFilter;
                            fallbackTex.magFilter = THREE.LinearFilter;
                            screen.material = new THREE.MeshBasicMaterial({ map: fallbackTex, side: THREE.DoubleSide });
                        }
                        window._isOn = true;
                    }
                    break;
                case 'next':
                    window._nextVideo();
                    break;
                case 'prev':
                    window._prevVideo();
                    break;
            }
            try {
                sessionStorage.setItem('tvState', JSON.stringify({
                    isOn: window._isOn,
                    volume: video.volume || 0.6
                }));
            } catch (e) {}
        }
    }
    setupTVInteractions();

    // Carton
    function setupCartonInteractions() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredRabat = null;

        function onMouseMove(event) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const rabats = window._cartonRabats || [];
            const meshes = rabats.map(r => r.mesh);
            const intersects = raycaster.intersectObjects(meshes);
            let newHover = null;
            if (intersects.length > 0) {
                const hit = intersects[0].object;
                for (let r of rabats) {
                    if (r.mesh === hit) { newHover = r; break; }
                }
            }

            if (newHover !== hoveredRabat) {
                if (hoveredRabat && !hoveredRabat.open) {
                    hoveredRabat.mesh.material = hoveredRabat.originalMat;
                }
                if (newHover && !newHover.open) {
                    newHover.mesh.material = newHover.hiMat;
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
                hoveredRabat = newHover;
            }
        }

        function onMouseClick(event) {
            if (!hoveredRabat) return;
            const r = hoveredRabat;
            if (r.animating) return;

            r.open = !r.open;
            r.targetAngle = r.open ? (r.pivot.position.z > 0 ? Math.PI : -Math.PI) : 0;
            r.animating = true;
            const startAngle = r.pivot.rotation.x;
            const targetAngle = r.targetAngle;
            const duration = 500;
            const startTime = performance.now();

            function animateRabat(time) {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                r.pivot.rotation.x = startAngle + (targetAngle - startAngle) * eased;
                if (progress < 1) {
                    requestAnimationFrame(animateRabat);
                } else {
                    r.pivot.rotation.x = targetAngle;
                    r.animating = false;
                    if (r.open) {
                        r.mesh.material = r.originalMat;
                    }
                    if (hoveredRabat === r && !r.open) {
                        r.mesh.material = r.hiMat;
                    }
                }
            }
            requestAnimationFrame(animateRabat);
        }

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onMouseClick);
    }
    setupCartonInteractions();

    // Lecteur de disquettes
    function setupDriveInteractions() {
        const drive = window._diskDrive;
        if (!drive) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoverButton = false;

        function onMouseMove(event) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const btn = drive.button;
            const intersects = raycaster.intersectObject(btn);
            if (intersects.length > 0) {
                canvas.style.cursor = 'pointer';
                btn.material.color.setHex(0xff6666);
                hoverButton = true;
            } else {
                if (hoverButton) {
                    btn.material.color.setHex(0xcc3333);
                    hoverButton = false;
                    canvas.style.cursor = 'default';
                }
            }
        }

        function onMouseClick(event) {
            if (!hoverButton) return;
            const drive = window._diskDrive;
            if (!drive || drive.trayAnimating) return;

            drive.trayOpen = !drive.trayOpen;
            drive.trayAnimating = true;
            const targetZ = drive.trayOpen ? 0.2 : 0;
            const startZ = drive.tray.position.z;
            const duration = 400;
            const startTime = performance.now();

            function animateTray(time) {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                drive.tray.position.z = startZ + (targetZ - startZ) * eased;
                if (progress < 1) {
                    requestAnimationFrame(animateTray);
                } else {
                    drive.tray.position.z = targetZ;
                    drive.trayAnimating = false;
                    if (!drive.trayOpen && drive.insertedDisk) {
                        loadVideoForDisk(drive.insertedDisk);
                    }
                }
            }
            requestAnimationFrame(animateTray);
        }

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onMouseClick);
    }
    setupDriveInteractions();

    // Meuble à tiroir
    function setupPedestalInteractions() {
        if (!window._pedestalDrawers) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredDrawer = null;

        canvas.addEventListener('mousemove', function(event) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            let newHover = null;
            for (let d of window._pedestalDrawers) {
                const intersects = raycaster.intersectObject(d.clickArea, false);
                if (intersects.length > 0) {
                    newHover = d;
                    break;
                }
            }

            if (newHover !== hoveredDrawer) {
                if (hoveredDrawer && !hoveredDrawer.isOpen) {
                    hoveredDrawer.frontPanel.material = hoveredDrawer.frontMat;
                    hoveredDrawer.handleMat.color.setHex(hoveredDrawer.originalHandleColor);
                }
                if (newHover && !newHover.isOpen) {
                    newHover.frontPanel.material = newHover.hoverMat;
                    newHover.handleMat.color.setHex(0xffdd99);
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
                hoveredDrawer = newHover;
            }
        });

        canvas.addEventListener('click', function(event) {
            if (!hoveredDrawer) return;
            const d = hoveredDrawer;
            if (d.isAnimating) return;

            d.isOpen = !d.isOpen;
            d.isAnimating = true;
            const targetZ = d.isOpen ? d.openDistance : 0;
            const startZ = d.group.position.z;
            const duration = 450;
            const startTime = performance.now();

            function animateDrawer(time) {
                const elapsed = time - startTime;
                let progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3) * Math.cos(progress * 2.5 * Math.PI);
                const currentZ = startZ + (targetZ - startZ) * eased;
                d.group.position.z = currentZ;

                if (progress < 1) {
                    requestAnimationFrame(animateDrawer);
                } else {
                    d.group.position.z = targetZ;
                    d.isAnimating = false;
                    if (!d.isOpen) {
                        d.frontPanel.material = d.frontMat;
                        d.handleMat.color.setHex(d.originalHandleColor);
                    }
                }
            }
            requestAnimationFrame(animateDrawer);
        });
    }
    setupPedestalInteractions();

    // Disquettes (drag & drop)
    let draggedDisk = null;
    let dragOffset = new THREE.Vector3();
    let diskOriginalParent = null;
    let diskOriginalPos = new THREE.Vector3();
    let diskOriginalQuat = new THREE.Quaternion();

    function setupDiskInteractions() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let isDragging = false;

        function getDiskFromIntersect(intersects) {
            for (let inter of intersects) {
                let obj = inter.object;
                while (obj && !obj.userData.isDisk) {
                    obj = obj.parent;
                }
                if (obj && obj.userData.isDisk) {
                    return obj;
                }
            }
            return null;
        }

        function onPointerDown(event) {
            const rect = canvas.getBoundingClientRect();
            const clientX = event.clientX || (event.touches && event.touches[0].clientX);
            const clientY = event.clientY || (event.touches && event.touches[0].clientY);
            if (clientX === undefined) return;
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const disks = window._disks || [];
            const intersects = raycaster.intersectObjects(disks, true);
            const disk = getDiskFromIntersect(intersects);
            if (disk) {
                isDragging = true;
                draggedDisk = disk;
                diskOriginalParent = disk.parent;
                diskOriginalPos.copy(disk.position);
                diskOriginalQuat.copy(disk.quaternion);
                if (disk.parent) {
                    disk.parent.remove(disk);
                }
                scene.add(disk);
                const intersectPoint = new THREE.Vector3();
                const planeIntersect = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                raycaster.ray.intersectPlane(planeIntersect, intersectPoint);
                if (intersectPoint) {
                    dragOffset.copy(disk.position).sub(intersectPoint);
                }
                canvas.style.cursor = 'grabbing';
            }
        }

        function onPointerMove(event) {
            if (!isDragging || !draggedDisk) return;
            const rect = canvas.getBoundingClientRect();
            const clientX = event.clientX || (event.touches && event.touches[0].clientX);
            const clientY = event.clientY || (event.touches && event.touches[0].clientY);
            if (clientX === undefined) return;
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const planeIntersect = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const targetPos = new THREE.Vector3();
            raycaster.ray.intersectPlane(planeIntersect, targetPos);
            if (targetPos) {
                targetPos.add(dragOffset);
                targetPos.y = 1.35;
                draggedDisk.position.copy(targetPos);
            }
        }

        function onPointerUp(event) {
            if (!isDragging || !draggedDisk) {
                isDragging = false;
                return;
            }

            const drive = window._diskDrive;
            let inserted = false;
            if (drive) {
                const trayWorldPos = drive.trayWorldPos || new THREE.Vector3(-7.18, 1.50, 5.29);
                const dist = draggedDisk.position.distanceTo(trayWorldPos);
                if (dist < 0.6) {
                    if (draggedDisk.parent) {
                        draggedDisk.parent.remove(draggedDisk);
                    }
                    const tray = drive.tray;
                    draggedDisk.position.set(0, 0.02, 0.02);
                    draggedDisk.rotation.set(0, 0, 0);
                    tray.add(draggedDisk);
                    drive.insertedDisk = draggedDisk;
                    drive.diskName = draggedDisk.userData.diskName;
                    if (drive.trayOpen && !drive.trayAnimating) {
                        drive.trayOpen = false;
                        drive.trayAnimating = true;
                        const targetZ = 0;
                        const startZ = drive.tray.position.z;
                        const duration = 400;
                        const startTime = performance.now();

                        function animateClose(time) {
                            const elapsed = time - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            drive.tray.position.z = startZ + (targetZ - startZ) * eased;
                            if (progress < 1) {
                                requestAnimationFrame(animateClose);
                            } else {
                                drive.tray.position.z = targetZ;
                                drive.trayAnimating = false;
                                loadVideoForDisk(draggedDisk);
                            }
                        }
                        requestAnimationFrame(animateClose);
                    } else {
                        loadVideoForDisk(draggedDisk);
                    }
                    inserted = true;
                }
            }

            if (!inserted) {
                if (draggedDisk.parent) {
                    draggedDisk.parent.remove(draggedDisk);
                }
                if (diskOriginalParent) {
                    diskOriginalParent.add(draggedDisk);
                    draggedDisk.position.copy(diskOriginalPos);
                    draggedDisk.quaternion.copy(diskOriginalQuat);
                } else {
                    const cartonGroup = window._diskGroup;
                    if (cartonGroup) {
                        cartonGroup.add(draggedDisk);
                        const maxX = 0.35, maxZ = 0.3;
                        draggedDisk.position.set(
                            (Math.random() - 0.5) * maxX * 2,
                            0.02,
                            (Math.random() - 0.5) * maxZ * 2
                        );
                        draggedDisk.rotation.y = (Math.random() - 0.5) * 0.4;
                    }
                }
            }

            isDragging = false;
            draggedDisk = null;
            canvas.style.cursor = 'default';
        }

        canvas.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            onPointerDown(e);
        }, { passive: false });
        window.addEventListener('touchmove', function(e) {
            e.preventDefault();
            onPointerMove(e);
        }, { passive: false });
        window.addEventListener('touchend', function(e) {
            e.preventDefault();
            onPointerUp(e);
        }, { passive: false });
    }
    setupDiskInteractions();

    // ─── PORTE INTÉRIEURE (ouvrir/fermer) ────────────────────────────
    function openMidDoor() {
        if (window._midDoorAnimating) return;
        const pivot = window._midDoorPivot;
        const isOpen = window._midDoorOpen;
        const targetAngle = isOpen ? 0 : Math.PI / 2;
        window._midDoorAnimating = true;
        const duration = 600;
        const startTime = performance.now();
        const startRot = pivot.rotation.y;

        function animateMidDoor(time) {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentAngle = startRot + (targetAngle - startRot) * eased;
            pivot.rotation.y = currentAngle;
            if (progress < 1) {
                requestAnimationFrame(animateMidDoor);
            } else {
                pivot.rotation.y = targetAngle;
                window._midDoorOpen = !isOpen;
                window._midDoorAnimating = false;
            }
        }
        requestAnimationFrame(animateMidDoor);
    }

    const raycasterMidDoor = new THREE.Raycaster();
    const mouseMidDoor = new THREE.Vector2();
    let hoverMidDoor = false;
    let midDoorHighlighted = false;

    function updateMidDoorInteraction(event) {
        const rect = canvas.getBoundingClientRect();
        mouseMidDoor.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseMidDoor.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycasterMidDoor.setFromCamera(mouseMidDoor, camera);
        const pivot = window._midDoorPivot;
        if (!pivot) return;
        const doorGroup = window._midDoorGroup;
        const meshes = [];
        doorGroup.children.forEach(child => {
            if (child.isMesh && (child === window._midDoorMesh || child.userData.isClickArea)) {
                meshes.push(child);
            }
        });
        const intersects = raycasterMidDoor.intersectObjects(meshes);
        if (intersects.length > 0) {
            canvas.style.cursor = 'pointer';
            if (!midDoorHighlighted && !window._midDoorOpen) {
                window._midDoorMesh.material = mDoorHighlight;
                midDoorHighlighted = true;
            }
            hoverMidDoor = true;
        } else {
            if (midDoorHighlighted) {
                window._midDoorMesh.material = mDoor;
                midDoorHighlighted = false;
            }
            hoverMidDoor = false;
        }
    }
    canvas.addEventListener('mousemove', updateMidDoorInteraction);

    canvas.addEventListener('click', function(event) {
        if (hoverMidDoor && !window._midDoorAnimating) {
            openMidDoor();
        }
    });

    // ─── PORTE EXTÉRIEURE (monologue) ──────────────────────────────────
    const raycasterDoor = new THREE.Raycaster();
    const mouseDoor = new THREE.Vector2();
    let hoverDoor = false;
    let doorHighlighted = false;

    function updateDoorInteraction(event) {
        const rect = canvas.getBoundingClientRect();
        mouseDoor.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseDoor.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycasterDoor.setFromCamera(mouseDoor, camera);
        const pivot = window._doorPivot;
        if (!pivot) return;
        const doorGroup = window._doorGroup;
        const meshes = [];
        doorGroup.children.forEach(child => {
            if (child.isMesh && (child === window._doorMesh || child.userData.isClickArea)) {
                meshes.push(child);
            }
        });
        const intersects = raycasterDoor.intersectObjects(meshes);
        if (intersects.length > 0) {
            canvas.style.cursor = 'pointer';
            if (!doorHighlighted && !window._doorOpen) {
                window._doorMesh.material = mDoorHighlight;
                doorHighlighted = true;
            }
            hoverDoor = true;
        } else {
            if (doorHighlighted) {
                window._doorMesh.material = mDoor;
                doorHighlighted = false;
            }
            hoverDoor = false;
        }
    }
    canvas.addEventListener('mousemove', updateDoorInteraction);

    canvas.addEventListener('click', function(event) {
        if (hoverDoor) {
            window._doorOpen = false;
            window._doorAnimating = false;
            showMonologue();
        }
    });

    // ─── MONOLOGUE ──────────────────────────────────────────────────────
    function showMonologue() {
        const container = document.createElement('div');
        container.id = 'monologueContainer';
        container.style.cssText = `
            position: fixed; bottom: 100px; left: 40px; right: 40px;
            max-width: 580px; z-index: 1000; font-family: 'Georgia', serif;
            color: rgba(255, 255, 255, 0.92); pointer-events: none;
            user-select: none; opacity: 0; transition: opacity 0.8s ease;
        `;

        const textBox = document.createElement('div');
        textBox.id = 'monologueText';
        textBox.style.cssText = `
            font-size: 20px; line-height: 1.9; letter-spacing: 0.4px;
            color: rgba(255, 255, 255, 0.88); text-shadow: 0 2px 30px rgba(0, 0, 0, 0.8);
            min-height: 70px; padding: 6px 0; white-space: pre-wrap;
            word-break: break-word; font-weight: 300; pointer-events: none;
        `;
        container.appendChild(textBox);

        const btnContainer = document.createElement('div');
        btnContainer.id = 'monologueBtns';
        btnContainer.style.cssText = `
            display: none; flex-direction: column; gap: 10px;
            margin-top: 22px; pointer-events: auto; align-items: flex-start;
        `;

        const yesBtn = document.createElement('button');
        yesBtn.textContent = 'Yes';
        yesBtn.style.cssText = `
            background: none; border: none; color: rgba(255, 255, 255, 0.5);
            padding: 4px 0; font-size: 18px; font-family: 'Georgia', serif;
            cursor: pointer; transition: all 0.4s ease; letter-spacing: 0.8px;
            font-weight: 300; pointer-events: auto; text-shadow: 0 2px 20px rgba(0,0,0,0.6);
        `;
        yesBtn.onmouseover = () => {
            yesBtn.style.color = 'rgba(255, 120, 120, 0.9)';
            yesBtn.style.transform = 'translateX(6px)';
        };
        yesBtn.onmouseout = () => {
            yesBtn.style.color = 'rgba(255, 255, 255, 0.5)';
            yesBtn.style.transform = 'translateX(0)';
        };
        yesBtn.onclick = () => {
            showResponse('So... you will join the eternal night.', true);
        };

        const noBtn = document.createElement('button');
        noBtn.textContent = 'No';
        noBtn.style.cssText = `
            background: none; border: none; color: rgba(255, 255, 255, 0.5);
            padding: 4px 0; font-size: 18px; font-family: 'Georgia', serif;
            cursor: pointer; transition: all 0.4s ease; letter-spacing: 0.8px;
            font-weight: 300; pointer-events: auto; text-shadow: 0 2px 20px rgba(0,0,0,0.6);
        `;
        noBtn.onmouseover = () => {
            noBtn.style.color = 'rgba(120, 180, 255, 0.9)';
            noBtn.style.transform = 'translateX(6px)';
        };
        noBtn.onmouseout = () => {
            noBtn.style.color = 'rgba(255, 255, 255, 0.5)';
            noBtn.style.transform = 'translateX(0)';
        };
        noBtn.onclick = () => {
            showResponse('Staying in this illusion won\'t bring you peace.', false);
        };

        btnContainer.appendChild(yesBtn);
        btnContainer.appendChild(noBtn);
        container.appendChild(btnContainer);
        document.body.appendChild(container);

        function typeText(text, callback) {
            const el = document.getElementById('monologueText');
            el.textContent = '';
            let index = 0;
            const speed = 35;

            function typeChar() {
                if (index < text.length) {
                    el.textContent += text.charAt(index);
                    index++;
                    setTimeout(typeChar, speed);
                } else if (callback) {
                    callback();
                }
            }
            typeChar();
        }

        function showResponse(text, redirect) {
            const textEl = document.getElementById('monologueText');
            const btns = document.getElementById('monologueBtns');
            btns.style.display = 'none';
            textEl.textContent = '';
            let index = 0;
            const speed = 35;

            function typeResponse() {
                if (index < text.length) {
                    textEl.textContent += text.charAt(index);
                    index++;
                    setTimeout(typeResponse, speed);
                } else if (redirect) {
                    setTimeout(() => {
                        window.location.href = 'https://pioupioucoder.github.io/EternalNight/';
                    }, 2200);
                } else {
                    setTimeout(() => {
                        const c = document.getElementById('monologueContainer');
                        if (c) {
                            c.style.opacity = '0';
                            setTimeout(() => {
                                c.remove();
                                window._doorOpen = false;
                                window._doorAnimating = false;
                            }, 800);
                        }
                    }, 3000);
                }
            }
            typeResponse();
        }

        setTimeout(() => {
            const c = document.getElementById('monologueContainer');
            if (c) c.style.opacity = '1';
            typeText('Do you wish to leave this illusion?', () => {
                const btns = document.getElementById('monologueBtns');
                btns.style.display = 'flex';
                btns.style.opacity = '0';
                setTimeout(() => {
                    btns.style.transition = 'opacity 0.8s ease';
                    btns.style.opacity = '1';
                }, 100);
            });
        }, 400);
    }

    // ─── RETOURNER UN GROUPE VIDE POUR LE DÉCALAGE ──────────────────
    return new THREE.Group();
}