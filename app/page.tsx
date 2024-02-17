"use client";
import { useState, useRef } from 'react';

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string>('');
  const [translation, setTranslation] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedAPI, setSelectedAPI] = useState<'OpenAI' | 'StabilityAI'>('OpenAI');
  const [logs, setLogs] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  const startRecording = async () => {
    try {
      addLog("Starting recording...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const audioChunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(audioUrl);
        addLog("Recording stopped. Translating audio...");
        translateAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      addLog("Recording started.");
    } catch (error) {
      console.error("Error accessing the microphone: ", error);
      addLog(`Error accessing the microphone: ${error}`);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current!.stop();
    setIsRecording(false);
    addLog("Stopping recording...");
  };

  const translateAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
  
    try {
      console.log("Translating.....");
      const response = await fetch("https://api.openai.com/v1/audio/translations", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });
  
      addLog(`Translation request sent, HTTP status: ${response.status}`);
  
      if (response.status !== 200) {
        console.error(`Error translating audio: HTTP status ${response.status}`);
        setTranslation('Error translating audio.');
        addLog(`Error translating audio: HTTP status ${response.status}`);
        return;
      }
  
      const data = await response.json();
      setTranslation(data.text);
      console.log("Translated: " + data.text);
      addLog("Translation completed.");
      // Use the selected API to generate an image
      selectedAPI === 'OpenAI' ? generateImage(data.text) : generateImageWithStabilityAI(data.text);
    } catch (error) {
      console.error("Error translating audio: ", error);
      addLog(`Error translating audio: ${error}`);
    }
  };

  const generateImage = async (promptText: string) => {
    try {
      addLog("Generating image with OpenAI...");
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: promptText,
          n: 1,
          size: "1024x1024",
        }),
      });

      addLog(`Image generation request sent, HTTP status: ${response.status}`);

      if (response.status !== 200) {
        console.error("Error generating image: ", response.error);
        addLog(`Error generating image: HTTP status ${response.status}`);
        return;
      }

      const data = await response.json();
      setImageUrl(data.data[0].url);
      addLog("Image generated successfully with OpenAI.");
    } catch (error) {
      console.error("Error generating image: ", error);
      addLog(`Error generating image: ${error}`);
    }
  };

  // Placeholder function for StabilityAI
  const generateImageWithStabilityAI = async (promptText: string) => {
    // Placeholder for future implementation
    addLog("Generating image with StabilityAI (placeholder)...");
    addLog("StabilityAI image generation not yet implemented.");
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
      <div>
        <label>
          <input
            type="radio"
            value="OpenAI"
            checked={selectedAPI === 'OpenAI'}
            onChange={() => setSelectedAPI('OpenAI')}
          />
          OpenAI
        </label>
        <label>
          <input
            type="radio"
            value="StabilityAI"
            checked={selectedAPI === 'StabilityAI'}
            onChange={() => setSelectedAPI('StabilityAI')}
          />
          StabilityAI
        </label>
      </div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {translation && <p>Translation: {translation}</p>}
      {imageUrl && <img src={imageUrl} alt="Generated Image" style={{ maxWidth: '500px' }} />}
      <div>
        <h3>Logs:</h3>
        <ul>
          {logs.map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
