import React from 'react';

export default class FamilyTree3DBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(!this.state.failed)return this.props.children;
    return <div className="dgft3d-unavailable" role="alert">
      <span>Tampilan 3D belum dapat dimuat.</span>
      <button type="button" className="dg-ui-action" onClick={this.props.onBack}>Kembali ke 2D</button>
      <button type="button" className="dg-ui-action" onClick={()=>this.setState({failed:false})}>Coba lagi</button>
    </div>;
  }
}
