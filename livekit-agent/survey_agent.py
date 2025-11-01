"""
AI Survey Agent - Week 3 Multi-Tier Survey System
Conducts post-conversation voice surveys via LiveKit outbound calls
Part of the escalation chain: in_widget → ai_call → sms_link → email_link
"""

import asyncio
import re
from datetime import datetime
from typing import Any, Dict, Optional

from livekit import agents, rtc
from livekit.agents import llm, voice

from backend_client import BackendClient
from config import Config


class PostConversationSurveyAgent(voice.VoiceAgent):
    """
    AI agent that calls users to collect post-conversation feedback

    Survey Flow:
    1. Wait 5 minutes after user declines in-widget survey
    2. Make outbound call to end user's phone number
    3. Ask 3-question survey (problem solved, rating, feedback)
    4. Save responses to database
    5. If no answer, trigger SMS fallback
    """

    def __init__(
        self,
        config: Config,
        backend_client: BackendClient,
        session_id: str,
        resolution_id: str,
        end_user_phone: str,
    ):
        """
        Initialize survey agent

        Args:
            config: Agent configuration
            backend_client: Client for backend API calls
            session_id: Session ID for the conversation
            resolution_id: Resolution ID to associate with survey
            end_user_phone: Phone number to call (+E164 format)
        """
        super().__init__(
            llm=llm.OpenAI(model="gpt-4o-mini"),  # Cost-optimized for simple surveys
            tts=voice.elevenlabs.TTS(voice="Rachel"),  # Professional voice
            stt=voice.deepgram.STT(),  # Accurate speech recognition
        )

        self.config = config
        self.backend = backend_client
        self.session_id = session_id
        self.resolution_id = resolution_id
        self.end_user_phone = end_user_phone

        # Survey questions
        self.questions = [
            {
                "text": "Hi! This is a quick follow-up about your recent conversation with our AI assistant. Was your issue resolved?",
                "type": "yes_no",
                "field": "problem_solved",
            },
            {
                "text": "On a scale of 1 to 5 stars, how would you rate your experience?",
                "type": "rating_1_5",
                "field": "experience_rating",
            },
            {
                "text": "Would you like to share any feedback about what we could improve?",
                "type": "open_ended",
                "field": "feedback_text",
            },
        ]

        # Call tracking
        self.call_start: Optional[datetime] = None
        self.call_answered = False
        self.responses: Dict[str, Any] = {}

    async def conduct_survey(self) -> bool:
        """
        Make outbound call and conduct survey

        Returns:
            True if survey completed, False if no answer (triggers SMS fallback)
        """
        self.call_start = datetime.now()

        try:
            # Create LiveKit room for outbound call
            room = await self._create_outbound_room()

            # Wait for user to join (30 second timeout)
            await asyncio.wait_for(self._wait_for_participant(room), timeout=30)
            self.call_answered = True

            # Conduct survey
            for question in self.questions:
                answer = await self._ask_question(question["text"], question["type"])
                self.responses[question["field"]] = answer

            # Thank user
            await self.say("Thank you for your feedback! This helps us improve our service. Have a great day!")

            # Save successful survey
            await self._save_survey_response(survey_completed=True)

            return True

        except asyncio.TimeoutError:
            # User didn't answer - proceed to SMS fallback
            self.call_answered = False
            await self._save_survey_response(survey_completed=False)
            await self._trigger_sms_fallback()
            return False

        except Exception as e:
            print(f"Survey call error: {e}")
            await self._save_survey_response(survey_completed=False, error=str(e))
            return False

        finally:
            # Cleanup
            if hasattr(self, 'room') and self.room:
                await self.room.disconnect()

    async def _create_outbound_room(self) -> rtc.Room:
        """
        Create LiveKit room for outbound call

        Uses LiveKit SIP integration to dial phone number
        """
        # Generate unique room name for survey call
        room_name = f"survey-{self.session_id}-{datetime.now().timestamp()}"

        # Create room with LiveKit API
        # In production, this would use LiveKit's SIP integration
        # For now, this is a placeholder for the production implementation
        room = rtc.Room()

        # Connect to LiveKit server
        await room.connect(
            url=self.config.livekit_url,
            token=self._generate_agent_token(room_name),
        )

        # Trigger outbound call via LiveKit SIP
        # This requires LiveKit SIP trunking configuration
        # await self._initiate_sip_call(room_name, self.end_user_phone)

        self.room = room
        return room

    async def _wait_for_participant(self, room: rtc.Room) -> None:
        """Wait for end user to join the call"""
        while len(room.remote_participants) == 0:
            await asyncio.sleep(0.1)

    async def _ask_question(self, question: str, question_type: str) -> Any:
        """
        Ask question and parse response

        Args:
            question: Question text to speak
            question_type: Type of question (yes_no, rating_1_5, open_ended)

        Returns:
            Parsed answer (bool, int, or str)
        """
        # Speak question
        await self.say(question)

        # Listen for user response
        response_text = await self._listen_for_response()

        # Parse based on question type
        if question_type == "yes_no":
            return self._parse_yes_no(response_text)
        elif question_type == "rating_1_5":
            return self._parse_rating(response_text)
        elif question_type == "open_ended":
            return response_text if response_text else "No feedback provided"

        return None

    def _parse_yes_no(self, text: str) -> bool:
        """Parse yes/no response"""
        text_lower = text.lower()

        # Affirmative keywords
        if any(word in text_lower for word in ["yes", "yeah", "yep", "sure", "correct", "right", "solved"]):
            return True

        # Negative keywords
        if any(word in text_lower for word in ["no", "nope", "not", "unsolved", "unresolved"]):
            return False

        # Default to False for ambiguous responses
        return False

    def _parse_rating(self, text: str) -> Optional[int]:
        """Parse 1-5 rating from response"""
        # Look for single digit 1-5
        match = re.search(r'\b([1-5])\b', text)
        if match:
            return int(match.group(1))

        # Look for word numbers
        word_to_num = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        }

        for word, num in word_to_num.items():
            if word in text.lower():
                return num

        # Default to middle rating if unclear
        return 3

    async def _listen_for_response(self, timeout: int = 10) -> str:
        """
        Listen for user's voice response

        Args:
            timeout: Seconds to wait for response

        Returns:
            Transcribed text from user
        """
        # This is a simplified placeholder
        # In production, this would use the LiveKit STT integration
        # to capture and transcribe the user's audio response

        # Wait for audio track from user
        await asyncio.sleep(timeout)

        # Return transcribed text
        # In actual implementation, this would come from Deepgram STT
        return "Yes"  # Placeholder

    async def _save_survey_response(
        self,
        survey_completed: bool,
        error: Optional[str] = None
    ) -> None:
        """
        Save survey response to database via backend API

        Args:
            survey_completed: Whether survey was completed
            error: Optional error message
        """
        call_duration = (
            (datetime.now() - self.call_start).total_seconds()
            if self.call_start
            else 0
        )

        # Prepare survey data
        survey_data = {
            "sessionId": self.session_id,
            "resolutionId": self.resolution_id,
            "surveyMethod": "ai_call",
            "callAnswered": self.call_answered,
            "callDurationSeconds": int(call_duration),
            "surveyCompleted": survey_completed,
        }

        # Add responses if completed
        if survey_completed and self.responses:
            survey_data.update({
                "problemSolved": self.responses.get("problem_solved"),
                "experienceRating": self.responses.get("experience_rating"),
                "feedbackText": self.responses.get("feedback_text"),
            })

        # Save via backend API
        try:
            await self.backend.create_survey_response(survey_data)
        except Exception as e:
            print(f"Failed to save survey response: {e}")

    async def _trigger_sms_fallback(self) -> None:
        """
        Trigger SMS fallback survey

        Called when user doesn't answer AI call
        Next tier: SMS link with 1-click survey
        """
        try:
            await self.backend.trigger_sms_survey(
                session_id=self.session_id,
                resolution_id=self.resolution_id,
                phone_number=self.end_user_phone,
            )
        except Exception as e:
            print(f"Failed to trigger SMS fallback: {e}")

    def _generate_agent_token(self, room_name: str) -> str:
        """
        Generate LiveKit access token for agent

        Args:
            room_name: Name of the room to join

        Returns:
            JWT token for LiveKit authentication
        """
        from livekit import api

        token = api.AccessToken(
            self.config.livekit_api_key,
            self.config.livekit_api_secret,
        )

        token.with_identity("survey-agent")
        token.with_name("AI Survey Agent")
        token.with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )

        return token.to_jwt()


async def schedule_survey_call(
    session_id: str,
    resolution_id: str,
    end_user_phone: str,
    delay_minutes: int = 5,
) -> None:
    """
    Schedule a survey call after delay

    Called when user clicks "Later" on in-widget feedback modal

    Args:
        session_id: Session ID for the conversation
        resolution_id: Resolution ID
        end_user_phone: Phone number to call
        delay_minutes: Minutes to wait before calling (default: 5)
    """
    # Wait for delay
    await asyncio.sleep(delay_minutes * 60)

    # Initialize agent
    config = Config.from_env()
    backend = BackendClient(config)

    agent = PostConversationSurveyAgent(
        config=config,
        backend_client=backend,
        session_id=session_id,
        resolution_id=resolution_id,
        end_user_phone=end_user_phone,
    )

    # Conduct survey
    completed = await agent.conduct_survey()

    if completed:
        print(f"Survey completed for session {session_id}")
    else:
        print(f"Survey not answered for session {session_id}, SMS fallback triggered")
