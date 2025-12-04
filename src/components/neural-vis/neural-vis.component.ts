
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';

@Component({
  selector: 'app-neural-vis',
  standalone: true,
  imports: [CommonModule],
  template: `<div #chart class="w-full h-full min-h-[400px]"></div>`,
  styles: [`:host { display: block; height: 100%; width: 100%; }`]
})
export class NeuralVisComponent implements OnInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartContainer!: ElementRef;
  @Input() mode: 'NEURAL' | 'MESH' = 'NEURAL';
  
  private simulation: any;
  private resizeObserver: ResizeObserver | null = null;

  ngOnInit() {
    this.initChart();
    this.resizeObserver = new ResizeObserver(() => {
        // Simple debounce could go here, but re-init for simplicity
        d3.select(this.chartContainer.nativeElement).selectAll('*').remove();
        this.initChart();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  ngOnDestroy() {
    if (this.simulation) this.simulation.stop();
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  initChart() {
    const element = this.chartContainer.nativeElement;
    const width = element.clientWidth;
    const height = element.clientHeight;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', 'transparent');

    const nodeCount = this.mode === 'NEURAL' ? 40 : 25;
    const linkChance = this.mode === 'NEURAL' ? 0.3 : 0.6;

    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i, group: Math.floor(Math.random() * 3) }));
    const links: any[] = [];

    // Create random links
    nodes.forEach((source, i) => {
        nodes.forEach((target, j) => {
            if (i !== j && Math.random() < linkChance / (this.mode === 'NEURAL' ? 3 : 1)) {
                 links.push({ source, target });
            }
        });
    });

    this.simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(this.mode === 'NEURAL' ? 100 : 80))
      .force('charge', d3.forceManyBody().strength(this.mode === 'NEURAL' ? -200 : -100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', ticked);

    const link = svg.append('g')
      .attr('stroke', this.mode === 'NEURAL' ? '#10b981' : '#3b82f6')
      .attr('stroke-opacity', 0.4)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d) => Math.sqrt(Math.random() * 3)); // Random weights simulation

    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', this.mode === 'NEURAL' ? 5 : 8)
      .attr('fill', this.mode === 'NEURAL' ? '#059669' : '#1d4ed8')
      .call(drag(this.simulation) as any);

    // Continuous "Liquid" Animation for Neural Mode
    if (this.mode === 'NEURAL') {
        setInterval(() => {
            link.transition().duration(2000)
                .attr('stroke-width', () => Math.random() * 4) // Simulate weight change
                .attr('stroke-opacity', () => Math.random() * 0.8 + 0.2);
            
            this.simulation.alpha(0.1).restart(); // Keep moving slightly
        }, 2000);
    }

    function ticked() {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);
    }

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
  }
}
