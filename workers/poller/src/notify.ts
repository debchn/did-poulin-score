export async function sendNotification(topic: string, message: string): Promise<void> {
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: message,
  });
  if (!res.ok) {
    console.error(`ntfy failed for topic ${topic}: ${res.status}`);
  }
}
