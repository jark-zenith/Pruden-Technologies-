# Multi-provider model configuration

The workforce keeps Anthropic as the primary provider and adds Gemini as an optional text-only fallback for runs that do not need server-side tools.

## Render environment variables

Add these in the private environment settings for the workforce backend. Never commit real keys to GitHub or place them in frontend variables.

- `ANTHROPIC_API_KEY`: existing primary provider key (keep unchanged).
- `ANTHROPIC_MODEL`: optional; defaults to `claude-sonnet-5` as currently configured.
- `GEMINI_API_KEY`: optional key from [Google AI Studio](https://aistudio.google.com/apikey).
- `GEMINI_MODEL`: optional; defaults to `gemini-flash-latest`.
- `WORKFORCE_TEXT_PROVIDER`: `auto` (default), `anthropic`, or `gemini`.

## Routing and safety

- `auto`: use Anthropic when configured; if Anthropic is absent, use Gemini only for text-only runs with no tools.
- `anthropic`: keep text runs on Anthropic; Gemini is not used as fallback.
- `gemini`: use Gemini for text-only runs. Runs that require GitHub or research tools remain on Anthropic because Gemini tool-call execution is not implemented in this first phase.
- This first phase does not automatically fail over on an Anthropic quota error. Configure `WORKFORCE_TEXT_PROVIDER=gemini` to deliberately route text-only runs to Gemini.
- The status endpoint reports provider configuration and model names, never API key values.
- Free-tier quotas, eligible models, and data-use terms are controlled by Google and may change. Do not send secrets or sensitive customer data to a provider without checking its terms.

## Python SDK example supplied by the founder

The backend uses the Google Gemini REST API via Node's built-in `fetch`, so no Python runtime or extra dependency is required. The equivalent SDK example is:

```python
from google import genai

client = genai.Client()  # reads GEMINI_API_KEY from the environment
response = client.models.generate_content(
    model="gemini-flash-latest",
    contents="Explain how AI works in a few words",
)
print(response.text)
```
