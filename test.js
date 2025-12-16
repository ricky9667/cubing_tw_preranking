const formatMultiblind = (value) => {
    const s = String(value).padStart(9, "0");

    const DD = s.slice(0, 2);
    const TTTTT = s.slice(2, 7);
    const MM = s.slice(7);

    let difference = 99 - DD
    let timeInSeconds = parseInt(TTTTT)
    let missed = parseInt(MM)
    let solved = difference + missed
    let attempted = solved + missed

    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = timeInSeconds % 60

    return `${solved}/${attempted} ${minutes}:${String(seconds).padStart(2, '0')}`
}

console.log(formatMultiblind(680336103))