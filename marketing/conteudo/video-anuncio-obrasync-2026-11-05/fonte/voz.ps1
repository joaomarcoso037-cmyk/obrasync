param([string]$Lista, [string]$Pasta, [string]$Voz, [double]$Taxa = 1.3)
$ErrorActionPreference = 'Stop'
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(); $task.Result }

$s = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$s.Voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq "Microsoft $Voz" }
$s.Options.SpeakingRate = $Taxa

$falas = Get-Content -Raw -Encoding UTF8 $Lista | ConvertFrom-Json
for ($i = 0; $i -lt $falas.Count; $i++) {
  $st = Await ($s.SynthesizeTextToStreamAsync($falas[$i])) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $r = New-Object Windows.Storage.Streams.DataReader($st)
  $n = [uint32]$st.Size
  [void](Await ($r.LoadAsync($n)) ([uint32]))
  $b = New-Object byte[] $n
  $r.ReadBytes($b)
  [IO.File]::WriteAllBytes((Join-Path $Pasta "$i.wav"), $b)
}
