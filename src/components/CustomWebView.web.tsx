import React from 'react';

const CustomWebView = (props: any) => {
  return (
    <iframe
      srcDoc={props.source?.html}
      style={{ width: '100%', height: '100%', border: 'none', ...props.style }}
    />
  );
};

export default CustomWebView;
