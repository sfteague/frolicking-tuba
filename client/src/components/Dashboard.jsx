import React, { Component } from 'react';
import { Row, Col, Grid, Button } from 'react-bootstrap';
import { Link } from 'react-router';

import DashboardTable from './DashboardTable.jsx';

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      keys: [{
        name: 'MyRow',
        key: 'somestring',
        endpoint: 'somenedpoint'
      },
      {
        name: 'MyRow2',
        key: 'somestring2',
        endpoint: 'somenedpoint2'
      }]
    };
  }

  componentDidMount() {
    this.getApiKeys();
  }

  getApiKeys() {
    fetch('/api/keys', { credentials: 'same-origin' })
    .then((response) => response.json())
    .then((json) => {
      this.setState({ keys: json });
    })
    .catch((error) => console.log('fetch /api/keys error:', error));
  }

  render() {
    return (
      <Grid>
        <Row className="mainLanding">
          <Col xs={12} md={12}>
            <h3>YOUR SCRIPT TAG</h3>
            <p>Copy and paste the script tag below into your html body.</p>
            <p><Button bsStyle="primary">Learn more</Button></p>
            <p><Link to="/create">Create Key</Link></p>
          </Col>
        </Row>
        <DashboardTable keys={this.state.keys} />
      </Grid>
    );
  }
}


export default Dashboard;

//convert html code to text.html
//http://www.freebits.co.uk/convert-html-code-to-text.html
