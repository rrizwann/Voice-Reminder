import os
import azure.cognitiveservices.speech as speechsdk

SPEECH_KEY = os.environ["AZURE_SPEECH_KEY"]
SPEECH_REGION = os.environ["AZURE_SPEECH_REGION"]
VOICE_NAME = "en-US-JennyNeural"


def synthesize_to_mp3(text: str) -> bytes:
    """Synthesize text to MP3 bytes using Azure Neural TTS."""
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
    speech_config.speech_synthesis_voice_name = VOICE_NAME
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    )

    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
    result = synthesizer.speak_text_async(text).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_data

    cancellation = result.cancellation_details
    raise RuntimeError(
        f"TTS failed: {cancellation.reason} — {cancellation.error_details}"
    )
