import * as React from 'react';
import './LineArrow.css';

const LineArrow: React.FunctionComponent = () => (
  <div className="line-arrow">
    <div className="line-arrow__line" />
    <div className="line-arrow__point" />
  </div>
);

export default LineArrow;
