document.addEventListener("DOMContentLoaded", function() {
    // It's good practice to wrap the script in a function to avoid global scope pollution.
    // This is a combination of the user-provided example and the logic from the HTML file.

    // --- Get attributes from the script tag ---
    // Use a query selector that is not dependent on the full URL.
    const scriptTag = document.querySelector('script[src*="https://raw.githubusercontent.com/MoiraAI2024/widget/refs/heads/main/moira-widget.js"]');
    const clientId = scriptTag ? scriptTag.getAttribute('data-client-id') : null;
    if (clientId) {
        console.log('Moira Widget: Client ID found:', clientId);
    }

    // --- CSS Styles ---
    const moiraStyles = `
        /* Moira Widget Styles */
        :root {
            --widget-background-color: #2c2f33;
            --widget-container-bg: #36393f;
            --widget-text-color: #ffffff;
            --widget-accent-color: #8c6a4d;
            --widget-speaking-glow: #e0c8b6;
            --widget-recording-color: #e64747;
        }

        #moira-widget .widget-container {
            position: relative;
            width: 266px;
            height: 399px;
            margin: 0 auto;
        }
        
        #moira-widget #avatar {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 15px;
            border: 5px solid var(--widget-accent-color);
            transition: all 0.3s ease;
        }

        #moira-widget #avatar.speaking {
            box-shadow: 0 0 35px 10px var(--widget-speaking-glow);
            transform: scale(1.05);
        }

        #moira-widget #record-button {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            background-color: rgba(0, 0, 0, 0.5);
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all 0.3s ease;
        }

        #moira-widget #record-button:hover {
            background-color: rgba(0, 0, 0, 0.7);
        }

        #moira-widget #record-button.recording {
            background-color: var(--widget-recording-color);
            animation: moira-pulse 1.5s infinite;
        }

        #moira-widget .mic-icon {
            width: 40px;
            height: 40px;
            fill: white;
        }

        @keyframes moira-pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(230, 71, 71, 0.7);
            }
            70% {
                box-shadow: 0 0 0 20px rgba(230, 71, 71, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(230, 71, 71, 0);
            }
        }
    `;

    // Inject the styles into the document
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = moiraStyles;
    document.head.appendChild(styleSheet);


    // --- Create HTML Elements dynamically ---
    const moiraWidget = document.createElement('div');
    moiraWidget.id = 'moira-widget';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'widget-container';

    const avatarImg = document.createElement('img');
    avatarImg.id = 'avatar';
    avatarImg.src = 'https://i.postimg.cc/pX8Ncg6K/Moira-teacher.png';
    avatarImg.alt = 'Avatar of Moira the teacher';

    const recordButtonDiv = document.createElement('div');
    recordButtonDiv.id = 'record-button';

    const micSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    micSvg.setAttribute('class', 'mic-icon');
    micSvg.setAttribute('viewBox', '0 0 24 24');
    const micPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    micPath.setAttribute('d', 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z');
    micSvg.appendChild(micPath);

    recordButtonDiv.appendChild(micSvg);
    widgetContainer.appendChild(avatarImg);
    widgetContainer.appendChild(recordButtonDiv);
    moiraWidget.appendChild(widgetContainer);

    // Find a container to append to, or default to the body.
    // A user can create a div with id="moira-container" to control placement.
    const userDefinedContainer = document.getElementById('moira-container');
    if (userDefinedContainer) {
        userDefinedContainer.appendChild(moiraWidget);
    } else {
        document.body.appendChild(moiraWidget);
    }

    // --- Widget JavaScript Logic ---
    const widget = document.getElementById('moira-widget');
    const avatar = widget.querySelector('#avatar');
    const recordButton = widget.querySelector('#record-button');

    // --- State ---
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let sessionId = null;

    // Function to generate a random UUID for the session
    function generateSessionId() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        } else {
            // Basic fallback for older browsers
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }
    
    // Set the session ID automatically when the widget initializes
    sessionId = generateSessionId();
    console.log('Moira Widget: Session ID automatically generated:', sessionId);

    async function startRecording() {
        if (!sessionId) {
            alert("Session not initialized for Moira Widget.");
            return;
        }
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            alert("Audio recording is not supported by your browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunks = [];
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioToApi(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordButton.classList.add('recording');
            
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Microphone access is required for the widget. Please allow access and try again.");
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        recordButton.classList.remove('recording');
    }

    async function sendAudioToApi(blob) {
        recordButton.style.display = 'none'; // Hide button while processing
        
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        formData.append('session_id', sessionId);
        // This could be made dynamic in a future version
        formData.append('question_text', 'Αυτό είναι ένα τετράδιο.'); 

        try {
            const resp = await fetch('https://moira0teacher0gos0demo0backend.share.zrok.io/v1/ai_teacher', {
                method: 'POST',
                body: formData,
                headers: {
                        'Accept': 'application/json',
                        'skip_zrok_interstitial': 'true'
                    },
                credentials: 'omit'
            });

            if (!resp.ok) {
                throw new Error(`API request failed with status ${resp.status}`);
            }
            
            const data = await resp.json();

            if (data && data.Audio) {
                playResponseAudio(data.Audio);
            } else {
                console.error('API response did not contain audio data.');
                recordButton.style.display = 'flex';
            }
        } catch (e) {
            console.error('Error sending audio to API:', e);
            alert('An error occurred with the widget. Please try again.');
            recordButton.style.display = 'flex';
        }
    }

    function playResponseAudio(base64Audio) {
        const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
        const audio = new Audio(audioSrc);
        
        avatar.classList.add('speaking');

        audio.onended = () => {
            avatar.classList.remove('speaking');
            recordButton.style.display = 'flex'; // Show button again
        };

        audio.onerror = (e) => {
            console.error('Error playing response audio:', e);
            avatar.classList.remove('speaking');
            recordButton.style.display = 'flex';
            alert('Could not play the audio response from the widget.');
        };

        audio.play();
    }

    // --- Event Listener ---
    recordButton.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    recordButton.disabled = false;
});
