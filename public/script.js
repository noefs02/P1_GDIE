document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // CONFIGURACIÓN Y VARIABLES ESTÁTICAS


    // --- DOM Elements: Contenedores principales y video ---
    const video = document.getElementById('video-player');
    const videoContainer = document.getElementById('video-wrapper');
    const videoControls = document.getElementById('video-controls');

    // --- DOM Elements: Botones e Iconos Clásicos ---
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = playPauseBtn.querySelector('span');
    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = muteBtn.querySelector('span');
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.getElementById('progress-bar');
    const progressFilled = document.getElementById('progress-filled');
    const progressWrapper = document.getElementById('progress-wrapper');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fullscreenIcon = fullscreenBtn.querySelector('span');

    // --- DOM Elements: Overlays (Carga y Errores) ---
    const errorOverlay = document.getElementById('error-overlay');
    const errorMessage = document.getElementById('error-message');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- DOM Elements: Capítulos ---
    const chaptersContainer = document.getElementById('chapters-container');
    const chapterHighlight = document.getElementById('chapter-hover-highlight');
    const chapterTooltip = document.getElementById('chapter-tooltip');

    // --- DOM Elements: Menús Flotantes (Subtítulos y Calidad) ---
    const ccBtn = document.getElementById('cc-btn');
    const ccMenu = document.getElementById('cc-menu');
    const ccList = document.getElementById('cc-list');

    const qualityBtn = document.getElementById('quality-btn');
    const qualityMenu = document.getElementById('quality-menu');
    const qualityListMain = document.getElementById('quality-list-main');
    const qualityListBasic = document.getElementById('quality-list-basic');
    const qualityHeader = document.getElementById('quality-header');

    // --- DOM Elements: Metadatos y Formaciones ---
    const formationGrid = document.getElementById('formation-grid');
    const syncContainer = document.getElementById('synchronized-info');
    const escudoLabel = document.getElementById('escudo-label');
    const escudoImg = document.getElementById('escudo-img');
    const entrenadorLabel = document.getElementById('entrenador-label');
    const entrenadorImg = document.getElementById('entrenador-img');
    const equipoLabel = document.getElementById('equipo-label');
    const equipoImg = document.getElementById('equipo-img');

    const sideInfo = document.getElementById('side-info');
    const formationText = document.getElementById('formation-text');
    const tacticsImg = document.getElementById('tactics-img');
    const attrContainer = document.getElementById('attributes-container');
    const stylesContainer = document.getElementById('styles-container');

    // --- Constantes del Reproductor ---
    const TRACKS_CONFIG = [
        { src: "media/subs/subs_esp.vtt", kind: "subtitles", srclang: "es", label: "Español", default: true },
        { src: "media/subs/subs_eng.vtt", kind: "subtitles", srclang: "en", label: "English" },
        { src: "media/subs/subs_cat.vtt", kind: "subtitles", srclang: "ca", label: "Català" },
        { src: "media/subs/subs_ger.vtt", kind: "subtitles", srclang: "de", label: "Deutsch" },
        { src: "media/vtt/chapters.vtt", kind: "chapters", srclang: "es", label: "Capítulos", default: true },
        { src: "media/vtt/metadata.vtt", kind: "metadata", label: "Metadata" }
    ];

    const styleColors = {
        'posesión': '#3b82f6', 'juego posicional': '#8b5cf6', 'robo salida': '#f59e0b',
        'directo': '#ef4444', 'contraataque': '#10b981', 'presión alta': '#f43fdfff',
        'juego vertical': '#08a3ebff', 'juego interior': '#46ef49ff',
        'combinativo': '#06b6d4', 'juego directo': '#cdbd2fff'
    };

    const attrMapping = {
        'alta': { width: '100%', color: '#ef4444' }, 'ofensiva': { width: '100%', color: '#ef4444' },
        'media': { width: '50%', color: '#eab308' }, 'equilibrada': { width: '50%', color: '#eab308' },
        'baja': { width: '15%', color: '#3b82f6' }, 'defensiva': { width: '15%', color: '#3b82f6' }
    };

    // --- Variables de Estado Dinámicas ---
    let currentHlsInstance = null;
    let currentDashInstance = null;
    let currentMode = 'basic'; // Puede ser: 'basic', 'hls', 'dash'


    // ==========================================
    // UTILIDADES Y HELPERS


    // Ocultar la UI nativa del navegador e inicializar volumen
    video.removeAttribute('controls');
    videoControls.style.display = '';
    videoControls.setAttribute('data-state', 'visible');
    video.volume = 0.5;

    /** Formatea los segundos a formato amigable MM:SS */
    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds)) return "00:00";
        const result = new Date(timeInSeconds * 1000).toISOString().substr(11, 8);
        return result.startsWith("00:") ? result.substr(3) : result;
    };

    /** Diccionario de errores nativos del HTML5 Video */
    const getErrorMessage = (error) => {
        if (!error) return "Error desconocido.";
        switch (error.code) {
            case 1: return "La descarga del vídeo fue cancelada.";
            case 2: return "Error de red al cargar el vídeo.";
            case 3: return "Error de decodificación del vídeo.";
            case 4: return "Formato de vídeo no soportado o archivo no encontrado.";
            default: return "Error desconocido al reproducir el vídeo.";
        }
    };


    // ==========================================
    // EVENTOS CORE DEL REPRODUCTOR NATIVO


    // Manejo de buffers, esperas de red y fallos críticos
    video.addEventListener('error', () => {
        errorOverlay.classList.remove('hidden');
        errorMessage.textContent = getErrorMessage(video.error);
        console.error("Video Error:", video.error);
    });

    video.addEventListener('stalled', () => console.warn("Video stalled - red lenta."));
    video.addEventListener('waiting', () => loadingOverlay.classList.remove('hidden'));

    video.addEventListener('playing', () => {
        loadingOverlay.classList.add('hidden');
        errorOverlay.classList.add('hidden');
    });

    video.addEventListener('canplay', () => loadingOverlay.classList.add('hidden'));

    // Carga inicial de metadatos (duración video)
    const setMetadata = () => {
        if (video.duration) {
            durationEl.textContent = formatTime(video.duration);
            progressBar.max = video.duration;
        }
    };
    if (video.readyState >= 1) setMetadata();
    else video.addEventListener('loadedmetadata', setMetadata);


    // ==========================================
    // PLAY, VOLUMEN, SEEK, FULLSCREEN


    // Play / Pause
    const togglePlay = () => {
        if (video.paused || video.ended) {
            video.play().catch(e => console.error("Error al reproducir:", e));
        } else {
            video.pause();
        }
    };
    playPauseBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    video.addEventListener('play', () => playPauseIcon.textContent = 'pause');
    video.addEventListener('pause', () => playPauseIcon.textContent = 'play_arrow');

    // Barra de progreso y Saltos en el tiempo
    video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const progressPercent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${progressPercent}%`;
        progressBar.value = video.currentTime;
        currentTimeEl.textContent = formatTime(video.currentTime);
    });

    progressBar.addEventListener('input', (e) => {
        video.currentTime = e.target.value;
    });

    // Volumen y Modo Silencio (Mute)
    const toggleMute = () => { video.muted = !video.muted; };
    muteBtn.addEventListener('click', toggleMute);

    volumeSlider.addEventListener('input', (e) => {
        video.volume = e.target.value;
        video.muted = e.target.value === '0';
    });

    video.addEventListener('volumechange', () => {
        volumeSlider.value = video.muted ? 0 : video.volume;
        if (video.muted || video.volume === 0) muteIcon.textContent = 'volume_off';
        else if (video.volume < 0.5) muteIcon.textContent = 'volume_down';
        else muteIcon.textContent = 'volume_up';
    });

    // Pantalla Completa
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (videoContainer.requestFullscreen) videoContainer.requestFullscreen();
            else if (videoContainer.webkitRequestFullscreen) videoContainer.webkitRequestFullscreen();
            else if (videoContainer.msRequestFullscreen) videoContainer.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    };
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
        fullscreenIcon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
    });


    // ==========================================
    // LÓGICA DE AUTO-OCULTAMIENTO DE CONTROLES


    let hideControlsTimeout;

    const resetControlsTimeout = () => {
        videoContainer.classList.remove('hide-controls');
        clearTimeout(hideControlsTimeout);

        // Si el video está en pausa, nunca ocultar los controles
        if (video.paused) return;

        hideControlsTimeout = setTimeout(() => {
            // Evitar ocultar si hay algun menú secundario expuesto al usuario
            if (ccMenu && !ccMenu.classList.contains('hidden')) return;
            if (qualityMenu && !qualityMenu.classList.contains('hidden')) return;
            videoContainer.classList.add('hide-controls');
        }, 2500);
    };

    videoContainer.addEventListener('mousemove', resetControlsTimeout);
    videoContainer.addEventListener('mouseleave', () => {
        if (!video.paused) videoContainer.classList.add('hide-controls');
    });

    video.addEventListener('play', resetControlsTimeout);
    video.addEventListener('pause', () => {
        videoContainer.classList.remove('hide-controls');
        clearTimeout(hideControlsTimeout);
    });

    // Encender contador por primera vez al cargar
    resetControlsTimeout();


    // ==========================================
    // GESTIÓN GLOBAL DE MENÚS FLOTANTES


    // Auto-cierre general haciendo clic en cualquier parte vacía
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-container')) {
            if (ccMenu) ccMenu.classList.add('hidden');
            if (qualityMenu) qualityMenu.classList.add('hidden');
        }
    });

    // Apertura y colisiones visuales entre menús
    ccBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ccMenu.classList.toggle('hidden');
        if (qualityMenu) qualityMenu.classList.add('hidden');
    });

    if (qualityBtn && qualityMenu) {
        qualityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            qualityMenu.classList.toggle('hidden');
            if (ccMenu) ccMenu.classList.add('hidden');

            // Reset visual: Siempre mostrar la cabecera madre (Main Menu)
            if (!qualityMenu.classList.contains('hidden')) {
                qualityListMain.classList.remove('hidden');
                qualityListBasic.classList.add('hidden');
                qualityHeader.textContent = 'Calidad';
            }
        });
    }


    // ==========================================
    // LÓGICAS DE PISTAS (VTT)


    let renderCCMenuHandler = null;
    let chapterHoverHandler = null;
    let progressLeaveHandler = null;
    let chaptersRenderHandler = null;
    let chaptersLoadHandler = null;
    let metadataRenderHandler = null;
    let metadataCueHandler = null;

    // Menú de Subtítulos
    const initSubtitles = () => {
        const tracks = video.textTracks;

        const renderCCMenu = () => {
            ccList.innerHTML = '';

            // Botón de desactivado forzoso
            const offLi = document.createElement('li');
            offLi.textContent = 'Desactivado';

            let anyActive = false;
            for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].kind === 'subtitles' && tracks[i].mode === 'showing') {
                    anyActive = true;
                    break;
                }
            }
            if (!anyActive) offLi.classList.add('active');

            offLi.addEventListener('click', () => {
                for (let i = 0; i < tracks.length; i++) {
                    if (tracks[i].kind === 'subtitles') tracks[i].mode = 'disabled';
                }
                ccMenu.classList.add('hidden');
                renderCCMenu();
            });
            ccList.appendChild(offLi);

            // Insertar botones de idiomas dinámicamente
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                if (track.kind === 'chapters' || track.kind === 'metadata') continue;
                if (track.kind !== 'subtitles') continue;

                const li = document.createElement('li');
                li.textContent = track.label || track.language || `Pista ${i + 1}`;
                if (track.mode === 'showing') li.classList.add('active');

                li.addEventListener('click', () => {
                    for (let j = 0; j < tracks.length; j++) {
                        if (tracks[j].kind === 'subtitles') tracks[j].mode = 'disabled';
                    }
                    track.mode = 'showing';
                    ccMenu.classList.add('hidden');
                    renderCCMenu();
                });
                ccList.appendChild(li);
            }
        };

        if (renderCCMenuHandler) tracks.removeEventListener('change', renderCCMenuHandler);
        renderCCMenuHandler = renderCCMenu;
        tracks.addEventListener('change', renderCCMenuHandler);
        renderCCMenu();
    };

    // Capítulos en Barra de Progreso
    const initChapters = () => {
        const chaptersTrack = Array.from(video.textTracks).find(track => track.kind === 'chapters');
        let chapterCues = [];

        chaptersContainer.innerHTML = '';
        if (chapterHoverHandler) progressWrapper.removeEventListener('mousemove', chapterHoverHandler);
        if (progressLeaveHandler) progressWrapper.removeEventListener('mouseleave', progressLeaveHandler);

        if (chaptersTrack) {
            chaptersTrack.mode = 'hidden';

            const renderChapters = () => {
                if (!video.duration || !chaptersTrack.cues) return;
                chapterCues = Array.from(chaptersTrack.cues);
                chaptersContainer.innerHTML = '';

                chapterCues.forEach((cue, index, array) => {
                    if (index === array.length - 1) return; // Omitir el marcador en formato final
                    const marker = document.createElement('div');
                    marker.classList.add('chapter-marker');
                    marker.style.left = `${(cue.endTime / video.duration) * 100}%`;
                    chaptersContainer.appendChild(marker);
                });
            };

            // Reciclaje de handlers por reinyecciones HLS
            if (chaptersRenderHandler) {
                chaptersTrack.removeEventListener('cuechange', chaptersRenderHandler);
                video.removeEventListener('loadedmetadata', chaptersRenderHandler);
            }
            if (chaptersLoadHandler) chaptersTrack.removeEventListener('load', chaptersLoadHandler);

            chaptersRenderHandler = renderChapters;
            chaptersLoadHandler = renderChapters;

            chaptersTrack.addEventListener('cuechange', chaptersRenderHandler);
            video.addEventListener('loadedmetadata', chaptersRenderHandler);
            chaptersTrack.addEventListener('load', chaptersLoadHandler);

            if (video.readyState >= 1) setTimeout(renderChapters, 100);

            // Rutinas de Hover
            chapterHoverHandler = (e) => {
                if (!video.duration || chapterCues.length === 0) return;

                const rect = progressWrapper.getBoundingClientRect();
                let percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const hoverTime = percent * video.duration;
                const activeCue = chapterCues.find(c => hoverTime >= c.startTime && hoverTime <= c.endTime);

                if (activeCue) {
                    chapterHighlight.classList.remove('hidden');
                    chapterTooltip.classList.remove('hidden');

                    const startPercent = (activeCue.startTime / video.duration) * 100;
                    const endPercent = (activeCue.endTime / video.duration) * 100;

                    chapterHighlight.style.left = `${startPercent}%`;
                    chapterHighlight.style.width = `${endPercent - startPercent}%`;
                    chapterTooltip.textContent = activeCue.text;
                    chapterTooltip.style.left = `${percent * 100}%`;
                } else {
                    chapterHighlight.classList.add('hidden');
                    chapterTooltip.classList.add('hidden');
                }
            };
            progressWrapper.addEventListener('mousemove', chapterHoverHandler);

            progressLeaveHandler = () => {
                chapterHighlight.classList.add('hidden');
                chapterTooltip.classList.add('hidden');
            };
            progressWrapper.addEventListener('mouseleave', progressLeaveHandler);
        }
    };

    // Metadatos y Paneles Táctiles
    const initMetadata = () => {
        const metadataTrackEl = document.querySelector('track[kind="metadata"]');

        if (metadataTrackEl && formationGrid) {
            const metadataTrack = metadataTrackEl.track;
            if (metadataTrack) metadataTrack.mode = 'hidden';

            // Creador visual de Formaciones Grid en la UI
            const renderGrid = () => {
                if (!metadataTrack || !metadataTrack.cues || metadataTrack.cues.length === 0) return;
                if (formationGrid.children.length > 0) return;

                Array.from(metadataTrack.cues).forEach(cue => {
                    try {
                        const data = JSON.parse(cue.text);
                        const formationId = data.id.replace('fmt-', '');

                        const item = document.createElement('div');
                        item.className = 'formation-item';
                        item.setAttribute('data-id', data.id);
                        item.title = data.payload.title || formationId;

                        const fallbackText = document.createElement('span');
                        fallbackText.textContent = formationId;
                        fallbackText.className = 'fallback-text';
                        item.appendChild(fallbackText);

                        const labelText = document.createElement('span');
                        labelText.className = 'formation-label';
                        labelText.textContent = formationId;
                        item.appendChild(labelText);

                        const img = document.createElement('img');
                        img.src = `media/images/formations/${formationId}.png`;
                        img.alt = data.payload.title;
                        img.onload = () => { fallbackText.style.display = 'none'; };
                        img.onerror = () => { img.style.display = 'none'; };
                        item.appendChild(img);

                        // Comportamiento del salto de vídeo al clickar
                        item.addEventListener('click', () => {
                            video.currentTime = cue.startTime + 0.1;
                            video.play().catch(() => { });
                        });

                        formationGrid.appendChild(item);
                    } catch (e) {
                        console.error("Error al parsear metadata cue:", e);
                    }
                });
            };

            // Reciclaje de Handlers
            if (metadataRenderHandler) {
                metadataTrackEl.removeEventListener('load', metadataRenderHandler);
                metadataTrack.removeEventListener('cuechange', metadataRenderHandler);
            }
            metadataRenderHandler = renderGrid;
            metadataTrackEl.addEventListener('load', renderGrid);

            if (metadataTrack && metadataTrack.cues && metadataTrack.cues.length > 0) renderGrid();
            else metadataTrack.addEventListener('cuechange', renderGrid);

            // Handler Masivo en Tiempo Real: El motor de sincronizacion HUD
            if (metadataCueHandler) metadataTrack.removeEventListener('cuechange', metadataCueHandler);

            metadataCueHandler = () => {
                let activeId = null;
                let activeData = null;

                if (metadataTrack.activeCues && metadataTrack.activeCues.length > 0) {
                    try {
                        activeData = JSON.parse(metadataTrack.activeCues[0].text);
                        activeId = activeData.id;
                    } catch (e) { }
                }

                // Resaltar tarjeta actual
                const allItems = formationGrid.querySelectorAll('.formation-item');
                allItems.forEach(item => {
                    if (activeId && item.getAttribute('data-id') === activeId) item.classList.add('active');
                    else item.classList.remove('active');
                });

                // Actualizar paneles Sidebar / Gráficos UI
                sidebarUpdating(activeData);
            };

            metadataTrack.addEventListener('cuechange', metadataCueHandler);
        }
    };

    // Recarga visual de la Sidebar basada en el VTT actual
    const sidebarUpdating = (activeData) => {
        if (!syncContainer) return;

        if (activeData && activeData.payload) {
            syncContainer.classList.remove('hidden');

            escudoLabel.textContent = activeData.payload.equipo;
            escudoImg.src = activeData.payload.imagenes[2];

            entrenadorLabel.textContent = activeData.payload.entrenador;
            entrenadorImg.src = activeData.payload.imagenes[0];

            equipoLabel.textContent = activeData.payload.año;
            equipoImg.src = activeData.payload.imagenes[1];

            if (sideInfo) {
                sideInfo.classList.remove('hidden');
                formationText.textContent = activeData.payload.text || '';
                tacticsImg.src = activeData.payload.imagenes[3] || '';

                if (activeData.payload.orientacion && attrContainer) {
                    attrContainer.classList.remove('hidden');
                    updateBarManual('orientacion', activeData.payload.orientacion);
                    updateBarManual('presion', activeData.payload.presion);
                    updateBarManual('amplitud', activeData.payload.amplitud);
                    updateBarManual('profundidad', activeData.payload.profundidad);

                    stylesContainer.innerHTML = '';
                    if (activeData.payload.estilo && Array.isArray(activeData.payload.estilo)) {
                        activeData.payload.estilo.forEach(est => {
                            const pill = document.createElement('span');
                            pill.className = 'style-pill';
                            pill.textContent = est;
                            pill.style.backgroundColor = styleColors[est.toLowerCase()] || '#6b7280';
                            stylesContainer.appendChild(pill);
                        });
                    }
                }
            }
        } else {
            // Limpieza si no hay metadatos en este segundo del vídeo
            if (escudoLabel) escudoLabel.textContent = '';
            if (escudoImg) escudoImg.src = '';
            if (entrenadorLabel) entrenadorLabel.textContent = '';
            if (entrenadorImg) entrenadorImg.src = '';
            if (equipoLabel) equipoLabel.textContent = '';
            if (equipoImg) equipoImg.src = '';
            if (formationText) formationText.textContent = '';
            if (tacticsImg) tacticsImg.src = '';
        }
    };

    // Display de barras de progresión cromáticas
    const updateBarManual = (idSuffix, value) => {
        const valEl = document.getElementById(`val-${idSuffix}`);
        const fillEl = document.getElementById(`fill-${idSuffix}`);
        if (valEl && fillEl) {
            valEl.textContent = value;
            const normalized = value.toLowerCase();
            if (attrMapping[normalized]) {
                fillEl.style.width = attrMapping[normalized].width;
                fillEl.style.backgroundColor = attrMapping[normalized].color;
            } else {
                fillEl.style.width = '0%';
            }
        }
    };


    // ==========================================
    // MOTOR DE INYECCIÓN DE PISTAS (CORE)


    // Destruye y recompone los tracks HTML para evitar fantasmas entre cambios de ABR
    const injectAndSetupTracks = () => {
        // Desactivación preventiva por bugs de TextTrack HTML5 nativos
        if (video.textTracks) {
            Array.from(video.textTracks).forEach(track => track.mode = 'disabled');
        }

        // Purgado del DOM
        video.querySelectorAll('track').forEach(t => t.remove());

        // Inyección pura
        TRACKS_CONFIG.forEach(config => {
            const trackEl = document.createElement('track');
            trackEl.src = config.src;
            trackEl.kind = config.kind;
            if (config.label) trackEl.label = config.label;
            if (config.srclang) trackEl.srclang = config.srclang;
            if (config.default) trackEl.default = true;
            video.appendChild(trackEl);
        });

        // Delay crítico para que el navegador absorba el DOM y lo registre en video.textTracks
        setTimeout(() => {
            initSubtitles();
            initChapters();
            initMetadata();
        }, 150);
    };


    // ==========================================
    // 9. REPRODUCTOR ABR (HLS / DASH)

    // Menú de Calidad 
    if (qualityListMain) {
        qualityListMain.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const action = li.getAttribute('data-action');

            if (action === 'basic') {
                qualityListMain.classList.add('hidden');
                qualityListBasic.classList.remove('hidden');
                qualityHeader.textContent = 'Básico';
            } else if (action === 'hls' || action === 'dash') {
                qualityListMain.querySelectorAll('li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                qualityMenu.classList.add('hidden');
                qualityListBasic.querySelectorAll('li[data-quality]').forEach(el => el.classList.remove('active'));

                switchABRProtocol(action);
            }
        });
    }

    if (qualityListBasic) {
        qualityListBasic.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const action = li.getAttribute('data-action');

            if (action === 'back') {
                qualityListMain.classList.remove('hidden');
                qualityListBasic.classList.add('hidden');
                qualityHeader.textContent = 'Calidad';
                return;
            }

            const quality = li.getAttribute('data-quality');
            if (quality) {
                // Modifica selección nativa
                qualityListBasic.querySelectorAll('li[data-quality]').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                qualityMenu.classList.add('hidden');

                // Mantén rastro en menú principal
                qualityListMain.querySelectorAll('li').forEach(el => el.classList.remove('active'));
                const basicActionLi = qualityListMain.querySelector('[data-action="basic"]');
                if (basicActionLi) basicActionLi.classList.add('active');

                switchABRProtocol('basic', quality);
            }
        });
    }

    // Purga las instancias ABR activas en memoria
    const destroyABR = () => {
        if (currentHlsInstance) {
            currentHlsInstance.destroy();
            currentHlsInstance = null;
        }
        if (currentDashInstance) {
            currentDashInstance.destroy();
            currentDashInstance = null;
        }
    };

    // Interruptor Global de Protocolos de Reproducción Web
    const switchABRProtocol = (protocol, basicQuality = '1080p') => {
        if (currentMode === protocol && protocol !== 'basic') return;
        currentMode = protocol;

        // Caché del estado previo
        const currentTime = video.currentTime;
        const isPaused = video.paused;
        const playbackRate = video.playbackRate;

        // Limpieza incondicional
        destroyABR();
        video.removeAttribute('src');

        const startPlayback = () => {
            video.currentTime = currentTime;
            video.playbackRate = playbackRate;
            if (!isPaused) {
                video.play().catch(e => console.error("Error startPlayback auto:", e));
            }
        };

        if (protocol === 'basic') {
            const webmSource = video.querySelector('source[type="video/webm"]');
            const mp4Source = video.querySelector('source[type="video/mp4"]');
            if (webmSource) webmSource.src = `media/videos/video_${basicQuality}.webm`;
            if (mp4Source) mp4Source.src = `media/videos/video_${basicQuality}.mp4`;

            video.load();
            video.addEventListener('loadeddata', function onLoaded() {
                injectAndSetupTracks();
                startPlayback();
                video.removeEventListener('loadeddata', onLoaded);
            }, { once: true });

        } else if (protocol === 'hls') {
            const hlsUrl = 'media/videos/ABR/master.m3u8';
            if (window.Hls && window.Hls.isSupported()) {
                const sources = video.querySelectorAll('source');
                sources.forEach(src => src.removeAttribute('src'));
                video.load();

                const hls = new window.Hls({ capLevelToPlayerSize: true });
                currentHlsInstance = hls;
                hls.loadSource(hlsUrl);
                hls.attachMedia(video);

                hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                    injectAndSetupTracks();
                    startPlayback();
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Dispositivos Apple puros (iOS/Safari)
                const sources = video.querySelectorAll('source');
                sources.forEach(src => src.removeAttribute('src'));
                video.src = hlsUrl;

                video.addEventListener('loadedmetadata', function onLoaded() {
                    injectAndSetupTracks();
                    startPlayback();
                    video.removeEventListener('loadedmetadata', onLoaded);
                }, { once: true });
            } else {
                alert("Navegador no compatible con HLS.");
            }

        } else if (protocol === 'dash') {
            const dashUrl = 'media/videos/ABR/manifest.mpd';
            if (typeof dashjs !== 'undefined') {
                const sources = video.querySelectorAll('source');
                sources.forEach(src => src.removeAttribute('src'));
                video.load();

                currentDashInstance = dashjs.MediaPlayer().create();
                currentDashInstance.initialize(video, dashUrl, false);

                currentDashInstance.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                    injectAndSetupTracks();
                    startPlayback();
                });
            } else {
                alert("dashjs no se cargó correctamente.");
            }
        }
    };


    // ==========================================
    // INICIALIZACIÓN

    // Generamos las pistas y detona en bucle el resto del ecosistema (HLS, Metadatos, Subs).
    injectAndSetupTracks();

});
