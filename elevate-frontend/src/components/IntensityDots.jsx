export default function IntensityDots({ value }) {
  return (
    <div className="intensity-dots">
      {[1,2,3,4,5].map(n => (
        <div key={n} className={`intensity-dot${n <= value ? ' on' : ''}`} />
      ))}
    </div>
  );
}
