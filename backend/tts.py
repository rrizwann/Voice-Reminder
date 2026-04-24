import os
import azure.cognitiveservices.speech as speechsdk

SPEECH_KEY = os.environ["AZURE_SPEECH_KEY"]
SPEECH_REGION = os.environ["AZURE_SPEECH_REGION"]
VOICE_NAME = "en-US-AriaNeural"

_SSML_TEMPLATE = """<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
    xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='en-US'>
  <voice name='{voice}'>
    <mstts:express-as style='friendly'>
      <prosody rate='0%' pitch='0%'>
        {text}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>"""


def synthesize_to_mp3(text: str) -> bytes:
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3
    )

    ssml = _SSML_TEMPLATE.format(voice=VOICE_NAME, text=text)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
    result = synthesizer.speak_ssml_async(ssml).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_data

    cancellation = result.cancellation_details
    raise RuntimeError(
        f"TTS failed: {cancellation.reason} — {cancellation.error_details}"
    )
