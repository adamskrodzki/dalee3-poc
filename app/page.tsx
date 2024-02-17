"use client";
import { useState, useRef } from 'react';

export default function Home() {
  const [openAIApiKey, setOpenAIApiKey] = useState<string>('');
  const [stabilityAIApiKey, setStabilityAIApiKey] = useState<string>('');
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
          'Authorization': `Bearer ${openAIApiKey}`, // Use OpenAI API key for translation
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
          'Authorization': `Bearer ${openAIApiKey}`, // Use OpenAI API key for image generation
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
        console.error("Error generating image: ", response.statusText);
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

  // Updated function for StabilityAI with a separate API key
  const generateImageWithStabilityAI = async (promptText: string) => {
    addLog("Generating image with StabilityAI...");

    const path = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image";

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${stabilityAIApiKey}`, // Use StabilityAI API key for image generation
    };

    const body = {
      steps: 40,
      width: 1024,
      height: 1024,
      seed: 0,
      cfg_scale: 5,
      samples: 1,
      text_prompts: [
        {
          text: promptText,
          weight: 1
        }
      ],
    };

    try {
      const response = await fetch(path, {
        headers,
        method: "POST",
        body: JSON.stringify(body),
      });

      addLog(`StabilityAI image generation request sent, HTTP status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Error generating image with StabilityAI: HTTP status ${response.status}`);
      }

      const responseJSON = await response.json();

      // Assuming the API returns a direct URL or a method to access the generated image
      // Adjust this logic based on the actual response structure from StabilityAI
      if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
        const imageUrl = responseJSON.artifacts[0].url; // This is a placeholder
        setImageUrl(imageUrl);
        addLog("Image generated successfully with StabilityAI.");
      } else {
        throw new Error("No image artifacts were returned by StabilityAI.");
      }
    } catch (error) {
      console.error("Error generating image with StabilityAI: ", error);
      addLog(`Error generating image with StabilityAI: ${error}`);
    }
  };

  return (
    <div>
      <div>
        <label>OpenAI API Key:</label>
        <input
          type="text"
          placeholder="Enter OpenAI API Key"
          value={apiKey}
          onChange={(e) => setOpenAIApiKey(e.target.value)}
        />
      </div>
      <div>
        <label>StabilityAI API Key:</label>
        <input
          type="text"
          placeholder="Enter StabilityAI API Key"
          style={{ marginBottom: '1rem' }}
          value={stabilityAIApiKey}
          onChange={(e) => setStabilityAIApiKey(e.target.value)}
        />
      </div>
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
