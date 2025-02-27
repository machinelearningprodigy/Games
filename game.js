// Space Defender - Game Logic
// Main game script handling all functionality

// ====== GAME INITIALIZATION AND SETUP ======
document.addEventListener('DOMContentLoaded', () => {
    // Game canvas and context setup
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match window size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Game state
    const gameState = {
        active: false,
        paused: false,
        currentScreen: 'start-menu',
        level: 1,
        score: 0,
        enemiesDestroyed: 0,
        difficulty: 'easy',
        shotsFired: 0,
        shotsHit: 0,
        levelStartTime: 0,
        playerUpgrades: {
            weaponBoost: 0,
            shieldBoost: 0,
            speedBoost: 0
        },
        settings: {
            sfxVolume: 80,
            musicVolume: 60,
            particleEffects: true
        }
    };
    
    // Player object
    const player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 50,
        height: 50,
        speed: 5,
        health: 100,
        maxHealth: 100,
        shield: 100,
        maxShield: 100,
        shieldRegenRate: 0.1,
        currentWeapon: 1, // Default weapon
        weapons: {
            1: { name: 'PULSAR', damage: 10, fireRate: 300, lastFired: 0, ammo: Infinity, projectileSpeed: 10, color: '#0af' },
            2: { name: 'THUNDER', damage: 25, fireRate: 500, lastFired: 0, ammo: 0, projectileSpeed: 15, color: '#f5f' },
            3: { name: 'NOVA', damage: 50, fireRate: 1000, lastFired: 0, ammo: 0, projectileSpeed: 8, color: '#ff5' }
        },
        specialAbility: {
            active: false,
            cooldown: 10000, // 10 seconds
            duration: 5000, // 5 seconds
            lastUsed: 0
        },
        movementKeys: { up: false, down: false, left: false, right: false },
        isFiring: false,
        isUsingSpecial: false,
        image: new Image()
    };
    
    // Load player ship image
    player.image.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><polygon points="25,5 40,40 25,30 10,40" fill="%230af" stroke="%23fff" stroke-width="1"/></svg>';
    
    // Game objects arrays
    let projectiles = [];
    let enemies = [];
    let particles = [];
    let powerups = [];
    let explosions = [];
    let stars = [];
    
    // Initialize stars background
    function initStars() {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    }
    
    initStars();
    
    // ====== INPUT HANDLING ======
    // Keyboard event listeners
    document.addEventListener('keydown', (e) => {
        if (!gameState.active) return;
        
        // Movement keys
        if (e.key === 'w' || e.key === 'ArrowUp') player.movementKeys.up = true;
        if (e.key === 's' || e.key === 'ArrowDown') player.movementKeys.down = true;
        if (e.key === 'a' || e.key === 'ArrowLeft') player.movementKeys.left = true;
        if (e.key === 'd' || e.key === 'ArrowRight') player.movementKeys.right = true;
        
        // Firing weapon
        if (e.key === ' ') player.isFiring = true;
        
        // Special ability
        if (e.key === 'Shift') activateSpecialAbility();
        
        // Weapon switching
        if (e.key === '1') switchWeapon(1);
        if (e.key === '2' && player.weapons[2].ammo > 0) switchWeapon(2);
        if (e.key === '3' && player.weapons[3].ammo > 0) switchWeapon(3);
        
        // Pause game
        if (e.key === 'Escape') togglePause();
    });
    
    document.addEventListener('keyup', (e) => {
        if (!gameState.active) return;
        
        if (e.key === 'w' || e.key === 'ArrowUp') player.movementKeys.up = false;
        if (e.key === 's' || e.key === 'ArrowDown') player.movementKeys.down = false;
        if (e.key === 'a' || e.key === 'ArrowLeft') player.movementKeys.left = false;
        if (e.key === 'd' || e.key === 'ArrowRight') player.movementKeys.right = false;
        
        if (e.key === ' ') player.isFiring = false;
    });
    
    // ====== GAME MECHANICS ======
    function updatePlayer() {
        // Apply speed boost if the player has upgrades
        const speedMultiplier = 1 + (gameState.playerUpgrades.speedBoost * 0.15);
        const adjustedSpeed = player.speed * speedMultiplier;
        
        // Movement
        if (player.movementKeys.up && player.y > 0) {
            player.y -= adjustedSpeed;
        }
        if (player.movementKeys.down && player.y < canvas.height - player.height) {
            player.y += adjustedSpeed;
        }
        if (player.movementKeys.left && player.x > 0) {
            player.x -= adjustedSpeed;
        }
        if (player.movementKeys.right && player.x < canvas.width - player.width) {
            player.x += adjustedSpeed;
        }
        
        // Weapon firing
        if (player.isFiring) {
            fireWeapon();
        }
        
        // Shield regeneration
        if (player.shield < player.maxShield) {
            player.shield += player.shieldRegenRate;
            if (player.shield > player.maxShield) {
                player.shield = player.maxShield;
            }
            updateShieldDisplay();
        }
        
        // Special ability cooldown
        if (!player.specialAbility.active && Date.now() - player.specialAbility.lastUsed >= player.specialAbility.cooldown) {
            document.getElementById('ability-cooldown').style.height = '0%';
        } else if (!player.specialAbility.active) {
            const cooldownPercentage = ((Date.now() - player.specialAbility.lastUsed) / player.specialAbility.cooldown) * 100;
            document.getElementById('ability-cooldown').style.height = `${100 - cooldownPercentage}%`;
        }
    }
    
    function switchWeapon(weaponId) {
        if (player.weapons[weaponId] && player.weapons[weaponId].ammo > 0) {
            player.currentWeapon = weaponId;
            
            // Update UI to show active weapon
            document.querySelectorAll('.weapon-slot').forEach(slot => {
                if (parseInt(slot.dataset.weapon) === weaponId) {
                    slot.style.boxShadow = '0 0 10px rgba(0, 170, 255, 0.5)';
                } else {
                    slot.style.boxShadow = 'none';
                }
            });
            
            // Play weapon switch sound
            playSound('menu-select-sound');
        }
    }
    
    function fireWeapon() {
        const weapon = player.weapons[player.currentWeapon];
        const now = Date.now();
        
        // Check if weapon can fire based on fire rate
        if (now - weapon.lastFired >= weapon.fireRate) {
            // Create projectile
            const projectile = {
                x: player.x + player.width / 2 - 5, // Center of player
                y: player.y - 10, // Front of player ship
                width: 10,
                height: 20,
                speed: weapon.projectileSpeed,
                damage: weapon.damage * (1 + gameState.playerUpgrades.weaponBoost * 0.2), // Apply weapon boost
                color: weapon.color
            };
            
            projectiles.push(projectile);
            weapon.lastFired = now;
            gameState.shotsFired++;
            
            // Play weapon sound
            playSound('laser-sound');
            
            // Decrease ammo for limited weapons
            if (weapon.ammo !== Infinity) {
                weapon.ammo--;
                updateWeaponDisplay();
                
                // Auto-switch to primary weapon if out of ammo
                if (weapon.ammo <= 0 && player.currentWeapon !== 1) {
                    switchWeapon(1);
                }
            }
            
            // Create muzzle flash particle effect
            if (gameState.settings.particleEffects) {
                for (let i = 0; i < 5; i++) {
                    createParticle(projectile.x + 5, projectile.y, weapon.color, 1, 3);
                }
            }
        }
    }
    
    function activateSpecialAbility() {
        const now = Date.now();
        
        if (!player.specialAbility.active && now - player.specialAbility.lastUsed >= player.specialAbility.cooldown) {
            player.specialAbility.active = true;
            player.specialAbility.lastUsed = now;
            
            // Show special ability activation message
            showMessage("SPECIAL ABILITY ACTIVATED");
            
            // Create energy wave effect
            createEnergyWave();
            
            // After duration, deactivate special ability
            setTimeout(() => {
                player.specialAbility.active = false;
            }, player.specialAbility.duration);
        }
    }
    
    function createEnergyWave() {
        // Create expanding wave effect
        const wave = {
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            radius: 0,
            maxRadius: 300,
            speed: 5,
            color: 'rgba(255, 80, 0, 0.5)'
        };
        
        // Animation loop for wave expansion
        function expandWave() {
            if (wave.radius < wave.maxRadius) {
                wave.radius += wave.speed;
                
                // Draw wave
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 80, 0, 0.1)';
                ctx.fill();
                ctx.strokeStyle = wave.color;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Check for enemy hits
                enemies.forEach(enemy => {
                    const dx = enemy.x + enemy.width / 2 - wave.x;
                    const dy = enemy.y + enemy.height / 2 - wave.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // If enemy is within wave radius and hasn't been hit by this wave yet
                    if (distance <= wave.radius && distance >= wave.radius - wave.speed && !enemy.hitByWave) {
                        enemy.health -= 30; // Damage from wave
                        enemy.hitByWave = true;
                        
                        // Create impact effect
                        for (let i = 0; i < 10; i++) {
                            createParticle(
                                enemy.x + enemy.width / 2,
                                enemy.y + enemy.height / 2,
                                '#ff5000',
                                2,
                                5
                            );
                        }
                        
                        // Check if enemy is destroyed
                        if (enemy.health <= 0) {
                            destroyEnemy(enemy);
                        }
                    }
                });
                
                requestAnimationFrame(expandWave);
            }
        }
        
        expandWave();
    }
    
    function updateProjectiles() {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            
            // Move projectile
            projectile.y -= projectile.speed;
            
            // Remove if out of bounds
            if (projectile.y + projectile.height < 0) {
                projectiles.splice(i, 1);
                continue;
            }
            
            // Check for collision with enemies
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                
                if (checkCollision(projectile, enemy)) {
                    // Damage enemy
                    enemy.health -= projectile.damage;
                    
                    // Create hit effect
                    if (gameState.settings.particleEffects) {
                        for (let k = 0; k < 8; k++) {
                            createParticle(
                                projectile.x + projectile.width / 2,
                                projectile.y,
                                projectile.color,
                                1,
                                3
                            );
                        }
                    }
                    
                    // Remove projectile
                    projectiles.splice(i, 1);
                    
                    // Increment hits counter
                    gameState.shotsHit++;
                    
                    // Check if enemy is destroyed
                    if (enemy.health <= 0) {
                        destroyEnemy(enemy);
                    }
                    
                    break;
                }
            }
        }
    }
    
    function updateEnemies() {
        // Move enemies and check for collisions with player
        enemies.forEach(enemy => {
            // Move based on pattern
            switch (enemy.pattern) {
                case 'straight':
                    enemy.y += enemy.speed;
                    break;
                case 'zigzag':
                    enemy.y += enemy.speed;
                    enemy.x += Math.sin(enemy.y * 0.05) * 2;
                    break;
                case 'circle':
                    enemy.angle += 0.02;
                    enemy.x = enemy.centerX + Math.cos(enemy.angle) * enemy.radius;
                    enemy.y += enemy.speed * 0.5;
                    break;
            }
            
            // Check if enemy is out of bounds
            if (enemy.y > canvas.height + 50) {
                removeEnemy(enemy);
                return;
            }
            
            // Enemy shooting logic
            if (enemy.canShoot && Math.random() < enemy.shootChance) {
                enemyShoot(enemy);
            }
            
            // Check collision with player
            if (checkCollision(enemy, player)) {
                // Damage player
                damagePlayer(enemy.collisionDamage);
                
                // Create impact effect
                if (gameState.settings.particleEffects) {
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 10, '#ff3');
                }
                
                // Remove enemy
                removeEnemy(enemy);
            }
        });
        
        // Spawn new enemies if needed
        if (enemies.length < getMaxEnemies()) {
            spawnEnemy();
        }
    }
    
    function removeEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index !== -1) {
            enemies.splice(index, 1);
        }
    }
    
    function destroyEnemy(enemy) {
        // Create explosion
        createExplosion(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            20,
            enemy.explosionColor
        );
        
        // Play explosion sound
        playSound('explosion-sound');
        
        // Add score
        addScore(enemy.score);
        
        // Increment enemies destroyed counter
        gameState.enemiesDestroyed++;
        
        // Chance to drop power-up
        if (Math.random() < enemy.dropChance) {
            spawnPowerup(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        }
        
        // Remove from array
        removeEnemy(enemy);
        
        // Update objective progress
        updateObjectiveProgress();
    }
    
    function enemyShoot(enemy) {
        const projectile = {
            x: enemy.x + enemy.width / 2 - 5,
            y: enemy.y + enemy.height,
            width: 8,
            height: 16,
            speed: -6, // Negative because it's moving down
            damage: enemy.projectileDamage,
            color: enemy.projectileColor,
            isEnemyProjectile: true
        };
        
        projectiles.push(projectile);
    }
    
    function updatePowerups() {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            
            // Move powerup down
            powerup.y += powerup.speed;
            
            // Rotation animation
            powerup.rotation += 0.05;
            
            // Remove if out of bounds
            if (powerup.y > canvas.height + 20) {
                powerups.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (checkCollision(powerup, player)) {
                // Apply powerup effect
                applyPowerup(powerup);
                
                // Create collection effect
                if (gameState.settings.particleEffects) {
                    for (let j = 0; j < 15; j++) {
                        createParticle(
                            powerup.x + powerup.width / 2,
                            powerup.y + powerup.height / 2,
                            powerup.color,
                            1,
                            4
                        );
                    }
                }
                
                // Play powerup sound
                playSound('powerup-sound');
                
                // Remove powerup
                powerups.splice(i, 1);
            }
        }
    }
    
    function applyPowerup(powerup) {
        switch (powerup.type) {
            case 'health':
                player.health += 30;
                if (player.health > player.maxHealth) {
                    player.health = player.maxHealth;
                }
                updateHealthDisplay();
                showMessage("+30 HEALTH");
                break;
                
            case 'shield':
                player.shield += 50;
                if (player.shield > player.maxShield) {
                    player.shield = player.maxShield;
                }
                updateShieldDisplay();
                showMessage("+50 SHIELD");
                break;
                
            case 'ammo':
                // Add ammo to special weapons
                player.weapons[2].ammo += 15;
                player.weapons[3].ammo += 8;
                updateWeaponDisplay();
                showMessage("+AMMO ACQUIRED");
                break;
                
            case 'speedBoost':
                // Temporary speed boost
                const originalSpeed = player.speed;
                player.speed *= 1.5;
                
                setTimeout(() => {
                    player.speed = originalSpeed;
                }, 8000); // 8 seconds duration
                
                showMessage("SPEED BOOST ACTIVATED");
                break;
        }
    }
    
    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Fade out
            particle.alpha -= 0.02;
            
            // Remove if faded out
            if (particle.alpha <= 0) {
                particles.splice(i, 1);
            }
        }
    }
    
    function updateExplosions() {
        for (let i = explosions.length - 1; i >= 0; i--) {
            const explosion = explosions[i];
            
            // Update size and opacity
            explosion.radius += explosion.speed;
            explosion.opacity -= 0.02;
            
            // Remove if faded out
            if (explosion.opacity <= 0) {
                explosions.splice(i, 1);
            }
        }
    }
    
    function updateStars() {
        stars.forEach(star => {
            // Move stars down to create scrolling background effect
            star.y += star.speed;
            
            // Reset star position if it moves off screen
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        });
    }
    
    // ====== COLLISION DETECTION ======
    function checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    // ====== ENTITY CREATION ======
    function spawnEnemy() {
        const enemyTypes = [
            {
                width: 40,
                height: 40,
                health: 20,
                speed: 1.5,
                score: 100,
                pattern: 'straight',
                color: '#f00',
                canShoot: false,
                collisionDamage: 10,
                dropChance: 0.1,
                explosionColor: '#f66'
            },
            {
                width: 50,
                height: 30,
                health: 30,
                speed: 2,
                score: 150,
                pattern: 'zigzag',
                color: '#f0f',
                canShoot: true,
                shootChance: 0.005,
                projectileDamage: 5,
                projectileColor: '#f6f',
                collisionDamage: 15,
                dropChance: 0.15,
                explosionColor: '#f6f'
            },
            {
                width: 60,
                height: 60,
                health: 50,
                speed: 1,
                score: 300,
                pattern: 'circle',
                color: '#f60',
                canShoot: true,
                shootChance: 0.01,
                projectileDamage: 10,
                projectileColor: '#f90',
                collisionDamage: 25,
                dropChance: 0.25,
                explosionColor: '#f90'
            }
        ];
        
        // Select random enemy type
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        
        // Create enemy object
        const enemy = {
            ...type,
            x: Math.random() * (canvas.width - type.width),
            y: -type.height,
            image: new Image()
        };
        
        // Add additional properties for special movement patterns
        if (enemy.pattern === 'circle') {
            enemy.centerX = enemy.x;
            enemy.angle = 0;
            enemy.radius = 50 + Math.random() * 50;
        }
        
        // Set enemy image based on type
        enemy.image.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${enemy.width}" height="${enemy.height}" viewBox="0 0 ${enemy.width} ${enemy.height}"><path d="M${enemy.width/2},0 L${enemy.width},${enemy.height} L0,${enemy.height} Z" fill="${enemy.color}" stroke="%23fff" stroke-width="1"/></svg>`;
        
        // Add to enemies array
        enemies.push(enemy);
    }
    
    function spawnPowerup(x, y) {
        const powerupTypes = [
            { type: 'health', color: '#0f0', symbol: '+' },
            { type: 'shield', color: '#00f', symbol: 'S' },
            { type: 'ammo', color: '#ff0', symbol: 'A' },
            { type: 'speedBoost', color: '#0ff', symbol: '>' }
        ];
        
        // Select random powerup type
        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        
        // Create powerup object
        const powerup = {
            x: x - 15, // Center at spawn location
            y: y - 15,
            width: 30,
            height: 30,
            speed: 1,
            rotation: 0,
            ...type
        };
        
        // Add to powerups array
        powerups.push(powerup);
    }
    
    function createParticle(x, y, color, speedFactor = 1, count = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 * speedFactor;
            
            const particle = {
                x: x,
                y: y,
                radius: Math.random() * 3 + 1,
                color: color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1
            };
            
            particles.push(particle);
        }
    }
    
    function createExplosion(x, y, particles = 20, color = '#ff0') {
        // Add particle explosion
        createParticle(x, y, color, 2, particles);
        
        // Add expanding ring effect
        const explosion = {
            x: x,
            y: y,
            radius: 5,
            maxRadius: 40,
            speed: 2,
            color: color,
            opacity: 0.7
        };
        
        explosions.push(explosion);
    }
    
    // ====== PLAYER INTERACTIONS ======
    function damagePlayer(amount) {
        // Check if player has shield
        if (player.shield > 0) {
            // Reduce shield first
            if (player.shield >= amount) {
                player.shield -= amount;
                amount = 0;
            } else {
                amount -= player.shield;
                player.shield = 0;
            }
            
            updateShieldDisplay();
        }
        
        // Apply remaining damage to health
        if (amount > 0) {
            player.health -= amount;
            
            // Screen shake effect
            shakeScreen(amount * 0.5);
            
            // Check if player died
            if (player.health <= 0) {
                gameOver();
                return;
            }
            
            updateHealthDisplay();
        }
        
        // Create damage effect
        if (gameState.settings.particleEffects) {
            createParticle(
                player.x + player.width / 2,
                player.y + player.height / 2,
                '#f00',
                1.5,
                10
            );
        }
    }
    
    let screenShake = 0;
    function shakeScreen(intensity) {
        screenShake = intensity;
        
        // Reset after a short time
        setTimeout(() => {
            screenShake = 0;
        }, 500);
    }
    
    // ====== UI UPDATES ======
    function updateHealthDisplay() {
        const healthPercentage = (player.health / player.maxHealth) * 100;
        document.getElementById('health-bar').style.width = `${healthPercentage}%`;
        document.getElementById('health-percentage').textContent = `${Math.floor(healthPercentage)}%`;
        
        // Change color based on health level
        if (healthPercentage < 25) {
            document.getElementById('health-bar').style.backgroundColor = '#f00';
        } else if (healthPercentage < 50) {
            document.getElementById('health-bar').style.backgroundColor = '#f90';
        } else {
            document.getElementById('health-bar').style.backgroundColor = '#0f0';
        }
    }
    
    function updateShieldDisplay() {
        const shieldPercentage = (player.shield / player.maxShield) * 100;
        document.getElementById('shield-bar').style.width = `${shieldPercentage}%`;
        document.getElementById('shield-percentage').textContent = `${Math.floor(shieldPercentage)}%`;
    }
    
    function updateWeaponDisplay() {
        document.getElementById('weapon-2-ammo').textContent = player.weapons[2].ammo;
        document.getElementById('weapon-3-ammo').textContent = player.weapons[3].ammo;
    }
    
    function showMessage(text) {
        const messageDisplay = document.getElementById('message-display');
        const messageText = document.getElementById('message-text');
        
        messageText.textContent = text;
        messageDisplay.classList.remove('hidden');
        
        // Hide after delay
        setTimeout(() => {
            messageDisplay.classList.add('hidden');
        }, 3000);
    }
    
    function addScore(points) {
        gameState.score += points;
        document.getElementById('score-value').textContent = gameState.score;
    }
    
    function updateObjectiveProgress() {
        // Calculate progress based on difficulty and level
        const totalEnemiesNeeded = getLevelObjective();
        const progress = Math.min(100, (gameState.enemiesDestroyed / totalEnemiesNeeded) * 100);
        
        document.getElementById('objective-bar').style.width = `${progress}%`;
        
        // Check if level complete
        if (gameState.enemiesDestroyed >= totalEnemiesNeeded) {
            levelComplete();
        }
    }
    
    function getLevelObjective() {
        // Base number of enemies needed to complete level
        const baseEnemies = 10;
        
        // Scale with level
        const levelScaling = gameState.level * 5;
        
        // Adjust for difficulty
        let difficultyMultiplier = 1;
        if (gameState.difficulty === 'easy') difficultyMultiplier = 0.7;
        if (gameState.difficulty === 'hard') difficultyMultiplier = 1.3;
        
        return Math.floor((baseEnemies + levelScaling) * difficultyMultiplier);
    }
    
});