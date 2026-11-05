namespace AresQA.Services;

/// <summary>Concurrent requests may finish; a switch waits for them and blocks new arrivals.</summary>
public sealed class BugModeGate
{
    private readonly SemaphoreSlim turnstile = new(1, 1);
    private readonly SemaphoreSlim readersMutex = new(1, 1);
    private readonly SemaphoreSlim roomEmpty = new(1, 1);
    private int readers;

    public async Task<IDisposable> EnterAsync(bool exclusive)
    {
        await turnstile.WaitAsync();
        if (exclusive)
        {
            await roomEmpty.WaitAsync();
            return new Lease(() => { roomEmpty.Release(); turnstile.Release(); });
        }
        await readersMutex.WaitAsync();
        if (++readers == 1) await roomEmpty.WaitAsync();
        readersMutex.Release();
        turnstile.Release();
        return new Lease(() =>
        {
            readersMutex.Wait();
            if (--readers == 0) roomEmpty.Release();
            readersMutex.Release();
        });
    }
    private sealed class Lease(Action release) : IDisposable
    {
        private Action? releaseAction = release;
        public void Dispose() => Interlocked.Exchange(ref releaseAction, null)?.Invoke();
    }
}
