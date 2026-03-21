import asyncio
from datetime import datetime, timezone
import json
from typing import Dict, List

from loguru import logger

from utils.json_helpers import json_dumps


# Manages Server-Sent Events connections with message buffering and processing state tracking.
#
# Sliding Window Architecture:
# - message_buffer: Holds most recent events (up to buffer_size)
# - accumulator_state: Accumulated state from events that overflow message_buffer
#
# Flow:
# 1. Events broadcast to message_buffer
# 2. When buffer exceeds size, oldest event is processed into accumulator_state
# 3. accumulator_state updated via registered handlers
#
# Frontend receives:
# 1. partial_response (accumulated state if available)
# 2. All events in message_buffer (up to 50 recent events)
# 3. New events as they stream in
class SSEManager:
    def __init__(self):
        """Initializes SSE connection queues, message buffers, and the server shutdown event."""
        self.active_connections: Dict[str, List[asyncio.Queue]] = {}
        self.message_buffer: Dict[str, List[dict]] = {}
        self.accumulator_state: Dict[
            str, dict
        ] = {}  # Tracks accumulative state per identifier
        self.accumulator_config: Dict[str, dict] = {}  # Custom config per identifier
        self.buffer_size = 50
        self.processing_ids: set = set()
        self.shutdown_event = asyncio.Event()

    def register_accumulator(
        self,
        identifier: str,
        initial_state: dict,
        event_handlers: Dict[str, callable],
        skip_buffer_events: List[str] = None,
    ):
        """
        Registers a custom accumulator for a session/workflow.

        Args:
            identifier (str): Session or workflow identifier.
            initial_state (dict): Initial state structure.
            event_handlers (Dict[str, callable]): Map of event_type -> handler(state, data).
            skip_buffer_events (List[str]): Events that should not be saved to message_buffer.
        """
        self.accumulator_state[identifier] = initial_state.copy()
        self.accumulator_config[identifier] = {
            "handlers": event_handlers,
            "skip_buffer": set(skip_buffer_events or []),
        }

    def mark_active(self, identifier: str):
        """
        Marks an identifier as actively processing.

        Args:
            identifier (str): Session or workflow identifier.
        """
        self.processing_ids.add(identifier)

    def mark_inactive(self, identifier: str):
        """
        Marks an identifier as no longer processing.

        Args:
            identifier (str): Session or workflow identifier.
        """
        self.processing_ids.discard(identifier)

    def is_active(self, identifier: str) -> bool:
        """
        Checks if an identifier is currently processing.

        Args:
            identifier (str): Session or workflow identifier.

        Returns:
            bool: True if active, False otherwise.
        """
        return identifier in self.processing_ids

    def clear_accumulator(self, identifier: str):
        """
        Clears the accumulator state and config for an identifier.

        Args:
            identifier (str): Session or workflow identifier.
        """
        if identifier in self.accumulator_state:
            del self.accumulator_state[identifier]
        if identifier in self.accumulator_config:
            del self.accumulator_config[identifier]

    async def subscribe(self, identifier: str):
        """
        Subscribes to the SSE stream and yields messages along with buffered history.

        Args:
            identifier (str): Session or workflow identifier.

        Yields:
            str: Formatted Server-Sent Event data strings.
        """

        # Send initial padding to establish connection
        yield ": " + (" " * 4096) + "\n\n"

        queue = asyncio.Queue()

        # Prevent duplicate connections: disconnect existing subscribers
        if identifier in self.active_connections:
            logger.info(
                f"Disconnecting {len(self.active_connections[identifier])} existing connection(s) for {identifier}"
            )
            for old_queue in self.active_connections[identifier][:]:
                old_queue.put_nowait(
                    json_dumps(
                        {
                            "event": "done",
                            "data": {"message": "New connection established"},
                        }
                    )
                )

            # Small delay to allow old connections to cleanup
            await asyncio.sleep(0.1)

        if identifier not in self.active_connections:
            self.active_connections[identifier] = []

        # Prevent memory exhaustion (DoS) by limiting the maximum number of connections per identifier
        MAX_CONNECTIONS = 50
        if len(self.active_connections[identifier]) >= MAX_CONNECTIONS:
            logger.warning(
                f"Connection limit reached for identifier {identifier}. Dropping oldest connection."
            )
            oldest_queue = self.active_connections[identifier].pop(0)
            oldest_queue.put_nowait(
                json_dumps(
                    {
                        "event": "error",
                        "data": {
                            "message": "Connection limit exceeded, disconnecting."
                        },
                    }
                )
            )

        self.active_connections[identifier].append(queue)

        try:
            # 1. Send Accumulator State (if available) - This is the "Starting Point"
            if identifier in self.accumulator_state:
                logger.info(
                    f"Sending accumulated state to new subscriber for {identifier}"
                )
                partial_response = {
                    "event": "partial_response",
                    "data": self.accumulator_state[identifier].copy(),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                yield f"data: {json_dumps(partial_response)}\n\n"

            # 2. Send Buffered Events (History)
            if identifier in self.message_buffer:
                for msg in self.message_buffer[identifier]:
                    yield f"data: {json_dumps(msg)}\n\n"

            # 3. Stream New Messages
            while not self.shutdown_event.is_set():
                try:
                    data_str = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"data: {data_str}\n\n"

                    # Check for terminal events
                    try:
                        payload = json.loads(data_str)
                        if payload.get("event") in [
                            "done",
                            "session_done",
                        ]:
                            break

                        # Legacy flat-format fallback
                        if payload.get("type") in ["done", "session_done"]:
                            break
                    except Exception:
                        pass

                    finally:
                        queue.task_done()

                except asyncio.TimeoutError:
                    # Send keep-alive comment to prevent connection timeout
                    yield ": keep-alive\n\n"
                    continue

        finally:
            # Cleanup connection on disconnect
            if identifier in self.active_connections:
                if queue in self.active_connections[identifier]:
                    self.active_connections[identifier].remove(queue)
                if not self.active_connections[identifier]:
                    del self.active_connections[identifier]

    async def broadcast(
        self, identifier: str, event_type: str, data: dict, save_to_buffer: bool = True
    ):
        """
        Broadcasts a structured message to all subscribed SSE clients.
        Implements sliding window pattern: events added to buffer, oldest consumed
        when buffer exceeds size.

        Args:
            identifier (str): Session or workflow identifier.
            event_type (str): Event type for the message.
            data (dict): Event payload data.
            save_to_buffer (bool): Whether to save this message to the history buffer.
        """
        message = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Add message to buffer first (sliding window step 1)
        if save_to_buffer:
            if identifier not in self.message_buffer:
                self.message_buffer[identifier] = []

            self.message_buffer[identifier].append(message)

            # Sliding window: when buffer exceeds size, consume oldest events
            if (
                identifier in self.accumulator_config
                and len(self.message_buffer[identifier]) > self.buffer_size
            ):
                config = self.accumulator_config[identifier]
                handlers = config["handlers"]
                state = self.accumulator_state[identifier]

                # Process overflow events: consume from oldest to newest until buffer size is met
                while len(self.message_buffer[identifier]) > self.buffer_size:
                    oldest_event = self.message_buffer[identifier].pop(0)
                    oldest_event_type = oldest_event["event"]
                    oldest_data = oldest_event["data"]

                    # Apply handler if defined for this event type
                    if oldest_event_type in handlers:
                        handlers[oldest_event_type](state, oldest_data)

                logger.debug(
                    f"Consumed overflow events for {identifier}, accumulated state updated"
                )

        # Send to active connections
        queues = self.active_connections.get(identifier)
        if queues:
            data_str = json_dumps(message)
            for queue in queues:
                queue.put_nowait(data_str)

    def broadcast_raw(
        self, identifier: str, message: dict, save_to_buffer: bool = True
    ):
        """
        Broadcasts a raw message without event structure wrapping.

        Args:
            identifier (str): Session or workflow identifier.
            message (dict): Raw message payload.
            save_to_buffer (bool): Whether to save this message to the history buffer.
        """

        # Buffer message
        if save_to_buffer:
            if identifier not in self.message_buffer:
                self.message_buffer[identifier] = []

            self.message_buffer[identifier].append(message)

            # Sliding window: when buffer is full, clear it (accumulator preserved)
            if len(self.message_buffer[identifier]) >= self.buffer_size:
                logger.debug(
                    f"Message buffer full for {identifier}, clearing buffer (accumulator preserved)"
                )
                self.message_buffer[identifier] = []

        # Send to active connections
        queues = self.active_connections.get(identifier)
        if not queues:
            return

        data_str = json_dumps(message)
        for queue in queues:
            queue.put_nowait(data_str)

        # Send to active connections
        queues = self.active_connections.get(identifier)
        if not queues:
            return

        data_str = json_dumps(message)
        for queue in queues:
            queue.put_nowait(data_str)

    def clear_buffer(self, identifier: str):
        """
        Clears the message buffer for a given identifier.

        Args:
            identifier (str): Session or workflow identifier.
        """
        if identifier in self.message_buffer:
            del self.message_buffer[identifier]

    def cleanup(self, identifier: str):
        """
        Cleans up all data and state associated with an identifier.

        Args:
            identifier (str): Session or workflow identifier.
        """
        self.clear_buffer(identifier)
        self.clear_accumulator(identifier)
        self.mark_inactive(identifier)

    async def shutdown(self):
        """Signals all active subscribers to close their connections during server shutdown."""

        # Set shutdown flag
        self.shutdown_event.set()

        # Notify all active connections
        for identifier in list(self.active_connections.keys()):
            await self.broadcast(
                identifier, "system", {"message": "Server is shutting down"}
            )


# Global manager instance
sse_manager = SSEManager()
