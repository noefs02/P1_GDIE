document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = playPauseBtn.querySelector('span');
    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = muteBtn.querySelector('span');
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.getElementById('progress-bar');
    const progressFilled = document.getElementById('progress-filled');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fullscreenIcon = fullscreenBtn.querySelector('span');
    const videoContainer = document.getElementById('video-wrapper');
    const errorOverlay = document.getElementById('error-overlay');
    const errorMessage = document.getElementById('error-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    const videoControls = document.getElementById('video-controls');

    // Elementos de capítulos
    const chaptersContainer = document.getElementById('chapters-container');
    const chapterHighlight = document.getElementById('chapter-hover-highlight');
    const chapterTooltip = document.getElementById('chapter-tooltip');
    const progressWrapper = document.getElementById('progress-wrapper');

    // Ocultar controles nativos y mostrar controles personalizados
    video.removeAttribute('controls');
    videoControls.style.display = ''; // Restaurar el display normal
    videoControls.setAttribute('data-state', 'visible');

    // Volumen por defecto al 50%
    video.volume = 0.5;

    // Mapeo explícito de códigos de error HTML5
    const getErrorMessage = (error) => {
        if (!error) return "Error desconocido.";
        switch (error.code) {
            case 1: return "La descarga del vídeo fue cancelada.";
            case 2: return "Error de red al cargar el vídeo.";
            case 3: return "Error de decodificación del vídeo.";
            case 4: return "Formato de vídeo no soportado o archivo no encontrado.";
            default: return "Error desconocido al intentar reproducir el vídeo.";
        }
    };

    // Formateador de tiempo
    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds)) return "00:00";
        const result = new Date(timeInSeconds * 1000).toISOString().substr(11, 8);
        return result.startsWith("00:") ? result.substr(3) : result;
    };

    // Gestión de errores explícita
    video.addEventListener('error', () => {
        errorOverlay.classList.remove('hidden');
        errorMessage.textContent = getErrorMessage(video.error);
        console.error("Video Error:", video.error);
    });

    video.addEventListener('stalled', () => {
        console.warn("Video stalled - red lenta o sin datos.");
    });

    video.addEventListener('waiting', () => {
        loadingOverlay.classList.remove('hidden');
    });

    video.addEventListener('playing', () => {
        loadingOverlay.classList.add('hidden');
        errorOverlay.classList.add('hidden');
    });

    video.addEventListener('canplay', () => {
        loadingOverlay.classList.add('hidden');
    });

    // Cargar metadatos (duración)
    const setMetadata = () => {
        if (video.duration) {
            durationEl.textContent = formatTime(video.duration);
            progressBar.max = video.duration;
        }
    };

    // Si los metadatos ya están cargados (ej. al refrescar la página)
    if (video.readyState >= 1) {
        setMetadata();
    } else {
        video.addEventListener('loadedmetadata', setMetadata);
    }

    // Play y Pause
    const togglePlay = () => {
        if (video.paused || video.ended) {
            video.play().catch(e => console.error("Error al reproducir:", e));
        } else {
            video.pause();
        }
    };

    playPauseBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    video.addEventListener('play', () => {
        playPauseIcon.textContent = 'pause';
    });

    video.addEventListener('pause', () => {
        playPauseIcon.textContent = 'play_arrow';
    });

    // Progreso del vídeo
    video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const progressPercent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${progressPercent}%`;
        progressBar.value = video.currentTime;
        currentTimeEl.textContent = formatTime(video.currentTime);
    });

    // Búsqueda en el vídeo (seek)
    progressBar.addEventListener('input', (e) => {
        video.currentTime = e.target.value;
    });

    // Volumen y Mute
    const toggleMute = () => {
        video.muted = !video.muted;
    };

    muteBtn.addEventListener('click', toggleMute);

    volumeSlider.addEventListener('input', (e) => {
        video.volume = e.target.value;
        video.muted = e.target.value === '0';
    });

    video.addEventListener('volumechange', () => {
        volumeSlider.value = video.muted ? 0 : video.volume;
        if (video.muted || video.volume === 0) {
            muteIcon.textContent = 'volume_off';
        } else if (video.volume < 0.5) {
            muteIcon.textContent = 'volume_down';
        } else {
            muteIcon.textContent = 'volume_up';
        }
    });

    // Pantalla completa
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            } else if (videoContainer.webkitRequestFullscreen) { /* Safari */
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.msRequestFullscreen) { /* IE11 */
                videoContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
    };

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenIcon.textContent = 'fullscreen_exit';
        } else {
            fullscreenIcon.textContent = 'fullscreen';
        }
    });

    // Subtítulos
    const ccBtn = document.getElementById('cc-btn');
    const ccMenu = document.getElementById('cc-menu');
    const ccList = document.getElementById('cc-list');

    // Obtener las pistas cuando el vídeo haya cargado sus metadatos o después
    const tracks = video.textTracks;

    const renderCCMenu = () => {
        ccList.innerHTML = '';

        // Opción de Desactivado
        const offLi = document.createElement('li');
        offLi.textContent = 'Desactivado';

        // Determinar si todos están inactivos ('hidden' o 'disabled')
        let anyActive = false;
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].kind === 'subtitles' && tracks[i].mode === 'showing') {
                anyActive = true;
                break;
            }
        }

        if (!anyActive) {
            offLi.classList.add('active');
        }

        offLi.addEventListener('click', () => {
            for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].kind === 'subtitles') {
                    tracks[i].mode = 'hidden';
                }
            }
            ccMenu.classList.add('hidden');
            renderCCMenu();
        });

        ccList.appendChild(offLi);

        // Opciones por cada idioma (track)
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (track.kind !== 'subtitles') continue;

            const li = document.createElement('li');
            li.textContent = track.label || track.language || `Pista ${i + 1}`;

            if (track.mode === 'showing') {
                li.classList.add('active');
            }

            li.addEventListener('click', () => {
                // Ocultar todas las pistas de subtítulos
                for (let j = 0; j < tracks.length; j++) {
                    if (tracks[j].kind === 'subtitles') {
                        tracks[j].mode = 'hidden';
                    }
                }
                // Mostrar solo la pista seleccionada
                track.mode = 'showing';
                ccMenu.classList.add('hidden');
                renderCCMenu();
            });

            ccList.appendChild(li);
        }
    };

    // Inicializamos el menú base
    renderCCMenu();

    // Si cambian nativamente, volver a renderizar
    tracks.addEventListener('change', renderCCMenu);

    ccBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ccMenu.classList.toggle('hidden');
    });

    // Cerrar menú si hacemos click fuera de la caja cc-container
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.cc-container')) {
            ccMenu.classList.add('hidden');
        }
    });

    // Capítulos
    const chaptersTrack = Array.from(video.textTracks).find(track => track.kind === 'chapters');
    let chapterCues = [];

    if (chaptersTrack) {
        chaptersTrack.mode = 'hidden';

        const renderChapters = () => {
            if (!video.duration || !chaptersTrack.cues) return;
            chapterCues = Array.from(chaptersTrack.cues);
            chaptersContainer.innerHTML = '';

            chapterCues.forEach((cue, index, array) => {
                if (index === array.length - 1) return; // No marker for the very end
                const marker = document.createElement('div');
                marker.classList.add('chapter-marker');
                marker.style.left = `${(cue.endTime / video.duration) * 100}%`;
                chaptersContainer.appendChild(marker);
            });
        };

        chaptersTrack.addEventListener('cuechange', renderChapters);
        video.addEventListener('loadedmetadata', renderChapters);

        // Si los metadatos ya están listos
        if (video.readyState >= 1) {
            setTimeout(renderChapters, 100);
        }

        // Hover events para progreso
        progressWrapper.addEventListener('mousemove', (e) => {
            if (!video.duration || chapterCues.length === 0) return;

            const rect = progressWrapper.getBoundingClientRect();
            let percent = (e.clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));

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
        });

        progressWrapper.addEventListener('mouseleave', () => {
            chapterHighlight.classList.add('hidden');
            chapterTooltip.classList.add('hidden');
        });
    }

    // -- Ocultar controles por inactividad --
    let hideControlsTimeout;

    const resetControlsTimeout = () => {
        videoContainer.classList.remove('hide-controls');
        clearTimeout(hideControlsTimeout);

        // Si el video está en pausa, no ocultar
        if (video.paused) return;

        hideControlsTimeout = setTimeout(() => {
            // No ocultar si el menú de subtítulos está desplegado
            if (ccMenu && !ccMenu.classList.contains('hidden')) return;
            videoContainer.classList.add('hide-controls');
        }, 2500);
    };

    videoContainer.addEventListener('mousemove', resetControlsTimeout);

    videoContainer.addEventListener('mouseleave', () => {
        if (!video.paused) {
            videoContainer.classList.add('hide-controls');
        }
    });

    video.addEventListener('play', resetControlsTimeout);

    video.addEventListener('pause', () => {
        videoContainer.classList.remove('hide-controls');
        clearTimeout(hideControlsTimeout);
    });

    // Iniciar temporizador al cargar por primera vez
    resetControlsTimeout();

    // -- Lógica de Cuadrícula de Formaciones --
    const formationGrid = document.getElementById('formation-grid');
    const metadataTrackEl = document.querySelector('track[kind="metadata"]');

    if (metadataTrackEl && formationGrid) {
        const metadataTrack = metadataTrackEl.track;
        metadataTrack.mode = 'hidden'; // Obliga al navegador a procesar los cues sin mostrar nada

        const renderGrid = () => {
            if (!metadataTrack.cues || metadataTrack.cues.length === 0) return;
            // Solo dibujamos si el grid está vacío
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
                    labelText.textContent = formationId; // Nombre de la formación encima
                    item.appendChild(labelText);

                    const img = document.createElement('img');
                    img.src = `media/images/formations/${formationId}.png`;
                    img.alt = data.payload.title;
                    img.onload = () => { fallbackText.style.display = 'none'; };
                    img.onerror = () => { img.style.display = 'none'; };

                    item.appendChild(img);

                    // pequeño margen (0.1s)para asegurar que el navegador detecte que hemos entrado en el nuevo 'cue'
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

        // Renderizamos cuando los datos de VTT se hayan cargado
        metadataTrackEl.addEventListener('load', renderGrid);

        // Ejecucioón manual por si el track cargó instantáneamente de la caché
        if (metadataTrack.cues && metadataTrack.cues.length > 0) {
            renderGrid();
        } else {
            // Un fallback ya que algunas veces 'load' no es emitido por el elemento <track> si lo ponemos a 'hidden'
            metadataTrack.addEventListener('cuechange', renderGrid);
        }

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

        const styleColors = {
            'posesión': '#3b82f6',
            'juego posicional': '#8b5cf6',
            'robo salida': '#f59e0b',
            'directo': '#ef4444',
            'contraataque': '#10b981',
            'presión alta': '#f43fdfff',
            'juego vertical': '#08a3ebff',
            'juego interior': '#46ef49ff',
            'combinativo': '#06b6d4',
            'juego directo': '#cdbd2fff'
        };

        const attrMapping = {
            'alta': { width: '100%', color: '#ef4444' },
            'ofensiva': { width: '100%', color: '#ef4444' },
            'media': { width: '50%', color: '#eab308' },
            'equilibrada': { width: '50%', color: '#eab308' },
            'baja': { width: '15%', color: '#3b82f6' },
            'defensiva': { width: '15%', color: '#3b82f6' }
        };

        const updateBar = (idSuffix, value) => {
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

        // Marcamos la imagen activa basándonos en el evento cuechange
        metadataTrack.addEventListener('cuechange', () => {
            let activeId = null;
            let activeData = null;
            if (metadataTrack.activeCues && metadataTrack.activeCues.length > 0) {
                try {
                    activeData = JSON.parse(metadataTrack.activeCues[0].text);
                    activeId = activeData.id;
                } catch (e) { }
            }

            const allItems = formationGrid.querySelectorAll('.formation-item');
            allItems.forEach(item => {
                if (activeId && item.getAttribute('data-id') === activeId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            if (syncContainer) {
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
                            updateBar('orientacion', activeData.payload.orientacion);
                            updateBar('presion', activeData.payload.presion);
                            updateBar('amplitud', activeData.payload.amplitud);
                            updateBar('profundidad', activeData.payload.profundidad);

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
                    // Limpiamos los textos/imágenes si no hay cue activo pero no ocultamos los contenedores visuales
                    if (escudoLabel) escudoLabel.textContent = '';
                    if (escudoImg) escudoImg.src = '';
                    if (entrenadorLabel) entrenadorLabel.textContent = '';
                    if (entrenadorImg) entrenadorImg.src = '';
                    if (equipoLabel) equipoLabel.textContent = '';
                    if (equipoImg) equipoImg.src = '';
                    if (formationText) formationText.textContent = '';
                    if (tacticsImg) tacticsImg.src = '';
                }
            }
        });
    }
});
