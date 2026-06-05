export default function Loading() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:12,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{width:36,height:36,border:'3px solid #e2e8f0',borderTopColor:'#1a4731',borderRadius:'50%',animation:'spin 0.6s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
