"use client";

import { getEnv } from "@/utils/env";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";

export default function TelehealthPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.appointmentId as string;

  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [appointmentInfo, setAppointmentInfo] = useState<{
    id: string;
    providerName?: string; 
    patientName?: string;
  } | null>(null);

  const endCall = () => {
    router.push('/appointments');
  };

  useEffect(() => {
    async function initVideoCall() {
      if (!appointmentId) {
        setAlert({ type: "error", msg: "Appointment ID is required" });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const roomName = `apt${appointmentId}`;
        const identity = `provider-${Date.now()}`;

        const joinResponse = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/telehealth/jitsi/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName,
            identity,
            ttlSeconds: 3600,
          }),
        });

        if (!joinResponse.ok) {
          const errorText = await joinResponse.text();
          if (joinResponse.status === 404) {
            throw new Error("Video call room not found. Please make sure the video call has been started.");
          }
          throw new Error(`Failed to get join token: ${errorText}`);
        }

        const joinData = await joinResponse.json();
        
        let url = joinData.meetingUrl || joinData.url || joinData.data?.meetingUrl || joinData.data?.url;
        
        if (!url) {
          const jitsiDomain = 'meet.jit.si';
          url = `https://${jitsiDomain}/${roomName}${joinData.token ? `?jwt=${joinData.token}` : ''}`;
        }

        setMeetingUrl(url);
        setAppointmentInfo({
          id: appointmentId,
          providerName: "Healthcare Provider",
          patientName: "Patient"
        });

      } catch (err: unknown) {
        console.error("Failed to initialize video call:", err);
        setAlert({
          type: "error",
          msg: err instanceof Error ? err.message : "Failed to join video call"
        });
      } finally {
        setLoading(false);
      }
    }

    initVideoCall();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg text-gray-700 dark:text-gray-300">Joining telehealth session...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait while we connect you</p>
      </div>
    );
  }

  if (!meetingUrl || !appointmentInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        {alert && (
          <div className="mb-4 max-w-md w-full">
            <Alert
              variant={alert.type}
              title={alert.type === "error" ? "Connection Error" : "Success"}
              message={alert.msg}
            />
          </div>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Unable to Join Video Call
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There was a problem connecting to the telehealth session.
          </p>
          <button
            onClick={() => router.push('/appointments')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <div className="flex items-center mr-6">
            <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Telehealth Session
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Appointment #{appointmentId}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          {alert && (
            <div className="max-w-xs">
              <Alert
                variant={alert.type}
                title=""
                message={alert.msg}
              />
            </div>
          )}
          <button
            onClick={endCall}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm transition-colors"
          >
            End Call
          </button>
        </div>
      </header>

      {/* Video Call Area */}
      <div className="flex-1 bg-black relative">
        <iframe
          src={meetingUrl}
          className="w-full h-full border-0"
          allow="camera; microphone; display-capture; fullscreen"
          title="Telehealth Video Call"
        />
        
        <div className="absolute top-4 left-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm font-medium">
              You&apos;re joining the video call. Please allow camera and microphone access when prompted.
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Your session is secure and private</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.open(meetingUrl, '_blank')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Open in New Window
            </button>
          </div>
        </div>
      </footer>
      <footer></footer>
    </div>
  );
}